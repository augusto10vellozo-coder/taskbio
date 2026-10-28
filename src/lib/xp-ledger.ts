// Pure mirror of the central XP ledger rules (grant_xp / revoke_xp in the database),
// plus daily-completion, routine streak and percentage league rules.
import { XP_CAP_EXEMPT, XP_DAILY_CAP, XP_DAY_COMPLETE_BONUS, shiftDay } from "@/lib/xp";

export type LedgerEvent = { userId: string; taskType: string; taskId: string; date: string; points: number };
const exempt = (t: string) => (XP_CAP_EXEMPT as readonly string[]).includes(t);
const key = (e: Pick<LedgerEvent, "taskType" | "taskId" | "date">) => `${e.taskType}|${e.taskId}|${e.date}`;

/** Grants once per taskType+taskId+date; normal grants stop at the daily cap. Returns points granted. */
export function grantXP(events: LedgerEvent[], e: LedgerEvent): number {
  if (e.points <= 0 || events.some((x) => x.userId === e.userId && key(x) === key(e))) return 0;
  let points = e.points;
  if (!exempt(e.taskType)) {
    const used = dayXp(events, e.userId, e.date, true);
    if (used >= XP_DAILY_CAP) return 0;
    points = Math.min(points, XP_DAILY_CAP - used);
  }
  events.push({ ...e, points });
  return points;
}

/** Removes the matching event; the migration opening balance is never revocable. */
export function revokeXP(events: LedgerEvent[], userId: string, taskType: string, taskId: string, date: string): number {
  if (taskType === "saldo_inicial_migracao") throw new Error("Saldo inicial não pode ser revogado");
  const i = events.findIndex((x) => x.userId === userId && key(x) === key({ taskType, taskId, date }));
  if (i < 0) return 0;
  return events.splice(i, 1)[0]!.points;
}

/** XP of a day ("85 / 150 XP hoje" reads the plain sum); capOnly excludes cap-exempt kinds. */
export function dayXp(events: LedgerEvent[], userId: string, date: string, capOnly = false) {
  return events.filter((x) => x.userId === userId && x.date === date && (!capOnly || !exempt(x.taskType))).reduce((n, x) => n + x.points, 0);
}

/** Grants or revokes the full-day bonus to match the day's completion. */
export function syncDayBonus(events: LedgerEvent[], userId: string, date: string, done: number, planned: number) {
  const complete = planned > 0 && done >= planned;
  if (complete) return grantXP(events, { userId, taskType: "bonus_dia_completo", taskId: date, date, points: XP_DAY_COMPLETE_BONUS });
  return -revokeXP(events, userId, "bonus_dia_completo", date, date);
}

export type PlannedBlock = { module: string; done: boolean };
/** Completion ratio of a day over active modules (medication never counts); null when nothing is planned. */
export function dayCompletion(blocks: PlannedBlock[], activeModules: string[]) {
  const planned = blocks.filter((b) => b.module !== "medicamento" && activeModules.includes(b.module));
  if (planned.length === 0) return null;
  return planned.filter((b) => b.done).length / planned.length;
}

/** Consecutive days (ending today or yesterday) with at least one completion; no freezes. */
export function routineStreak(daysWithCompletion: Set<string>, today: string) {
  let d = daysWithCompletion.has(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (daysWithCompletion.has(d)) { n++; d = shiftDay(d, -1); }
  return n;
}

export type PercentRow = { user_id: string; pct: number | null; streak_rotina: number; day_xp: number };
/** Daily league: excludes people with nothing planned; % desc, then routine streak, then day XP. */
export function rankByCompletion<T extends PercentRow>(rows: T[]) {
  return rows.filter((r) => r.pct !== null).sort((a, b) => b.pct! - a.pct! || b.streak_rotina - a.streak_rotina || b.day_xp - a.day_xp);
}

/** Weekly league score: mean of daily completion over days that had something planned. */
export function weeklyCompletionAverage(daily: (number | null)[]) {
  const v = daily.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** "Cezar · 87%" */
export const leagueLabel = (name: string, pct: number) => `${name} · ${Math.round(pct * 100)}%`;
