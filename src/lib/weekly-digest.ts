/** Weekly digest: pure week math and statistics, shared by the endpoint and tests. */

const DAY_MS = 86400000;

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Monday-based week containing the given day (yyyy-MM-dd). */
export function weekRange(day: string): { start: string; end: string; keys: string[] } {
  const d = new Date(`${day}T12:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const start = new Date(d.getTime() - offset * DAY_MS);
  const keys = Array.from({ length: 7 }, (_, i) => iso(new Date(start.getTime() + i * DAY_MS)));
  return { start: keys[0]!, end: keys[6]!, keys };
}

/** The week that ended before the given day (used on Mondays). */
export function previousWeek(day: string) {
  return weekRange(iso(new Date(new Date(`${day}T12:00:00Z`).getTime() - 7 * DAY_MS)));
}

type Block = { kind?: string; done?: boolean };

export type WeekStats = {
  daysActive: number;
  planned: number;
  done: number;
  workouts: number;
  meals: number;
  habits: number;
};

/** Counts the week from the synced data. Never invents values for missing days. */
export function weekStats(plan: unknown, settings: unknown, keys: string[]): WeekStats {
  const p = (plan && typeof plan === "object" ? plan : {}) as Record<string, Block[] | undefined>;
  const s = (settings && typeof settings === "object" ? settings : {}) as { habitLog?: Record<string, string[]> };
  const log = s.habitLog && typeof s.habitLog === "object" ? s.habitLog : {};

  let daysActive = 0;
  let planned = 0;
  let done = 0;
  let workouts = 0;
  let meals = 0;
  let habits = 0;

  for (const key of keys) {
    const blocks = Array.isArray(p[key]) ? (p[key] as Block[]) : [];
    const marked = Array.isArray(log[key]) ? (log[key] as string[]) : [];
    const doneBlocks = blocks.filter((b) => b && b.done === true);
    planned += blocks.filter(Boolean).length;
    done += doneBlocks.length;
    workouts += doneBlocks.filter((b) => b.kind === "treino").length;
    meals += doneBlocks.filter((b) => b.kind === "refeicao").length;
    habits += marked.length;
    if (doneBlocks.length > 0 || marked.length > 0) daysActive += 1;
  }

  return { daysActive, planned, done, workouts, meals, habits };
}

/** A week worth mentioning: at least one action. Dormant accounts are not emailed. */
export const hasActivity = (stats: WeekStats) => stats.daysActive > 0 || stats.done > 0 || stats.habits > 0;
