// Pure XP rules shared by the server function and tests.
export type XpKind = "habit" | "block" | "meal" | "workout" | "photo";
export const XP_POINTS: Record<XpKind, number> = { habit: 10, block: 5, meal: 5, workout: 10, photo: 5 };
export const LEAGUE_DAILY_CAP = 100;

/** Calendar day (yyyy-MM-dd) in Brasília time. */
export function brasiliaDay(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Sunday that starts the league week containing `day` (yyyy-MM-dd). */
export function leagueWeekStart(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

export function shiftDay(day: string, days: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Input = { kind: XpKind; date: string; foodItems?: number | undefined };

/** Points awarded: 0 for past/future days (history only) and for meals without a food-base item. */
export function xpFor(input: Input, today: string) {
  if (input.date !== today) return 0;
  if (input.kind === "meal" && !(input.foodItems && input.foodItems > 0)) return 0;
  return XP_POINTS[input.kind];
}

/** League total for a week: each day capped at LEAGUE_DAILY_CAP. */
export function cappedWeekXp(events: { day: string; points: number }[]) {
  const byDay = new Map<string, number>();
  events.forEach((e) => byDay.set(e.day, (byDay.get(e.day) ?? 0) + e.points));
  return [...byDay.values()].reduce((n, v) => n + Math.min(LEAGUE_DAILY_CAP, v), 0);
}

export type LeagueRow = { user_id: string; week_xp: number; habit_days: number; first_mark_sec: number };
/** Ranking order: XP, then more days with habits, then who marked earlier in the day. */
export function rankLeague<T extends LeagueRow>(rows: T[]) {
  return [...rows].sort((a, b) => b.week_xp - a.week_xp || b.habit_days - a.habit_days || a.first_mark_sec - b.first_mark_sec);
}
