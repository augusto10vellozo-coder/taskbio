// Pure XP rules shared by the server function and tests.
// Single source of XP weights. The database grant_xp function enforces the cap and idempotency;
// habit/reading/study weights are mirrored in their server-only RPCs (migration central_xp_ledger).
export const XP_BILL_PAID = 5;
export type XpKind = "habit" | "block" | "meal" | "workout" | "photo" | "reading" | "study" | "bill";
export const XP_POINTS: Record<XpKind, number> = { habit: 5, block: 5, meal: 5, workout: 15, photo: 5, reading: 10, study: 10, bill: XP_BILL_PAID };
export const XP_DAY_COMPLETE_BONUS = 20;
export const XP_DAILY_CAP = 150;
/** Kinds that never count toward the daily cap. */
export const XP_CAP_EXEMPT = ["bonus", "bonus_dia_completo", "saldo_inicial_migracao"] as const;
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

export type LeagueRow = { user_id: string; week_xp: number; habit_days: number; first_mark_sec: number; week_pct?: number | null; streak_rotina?: number };
const pctOf = (r: LeagueRow) => (r.week_pct == null ? -1 : Math.round(Number(r.week_pct) * 100));
const rot = (r: LeagueRow) => r.streak_rotina ?? 0;
const same = (a: LeagueRow, b: LeagueRow) => pctOf(a) === pctOf(b) && rot(a) === rot(b);
/** Ranking: people with planned blocks only; weekly completion % (server-computed), then routine streak. Never XP or module count. */
export function rankLeague<T extends LeagueRow>(rows: T[]) {
  return rows.filter((r) => r.week_pct != null).sort((a, b) => pctOf(b) - pctOf(a) || rot(b) - rot(a));
}
/** Positions with full ties (same % and routine streak) sharing the place (1º, 1º, 3º). */
export function leaguePositions(ranked: LeagueRow[]) {
  return ranked.map((r) => ranked.findIndex((x) => same(x, r)) + 1);
}
/** Whole percentage shown in the ranking, or null when nothing was planned. */
export const leaguePct = (r: LeagueRow) => (r.week_pct == null ? null : Math.round(Number(r.week_pct) * 100));

export type WeekTitle = "Campeão" | "Muralha da constância" | "Recomeço";
/** Titles for an already-ranked league (needs 2+ members): 1st place, longest streak, came back after a missed day. */
export function weekTitles<T extends LeagueRow & { streak: number; comeback?: boolean }>(ranked: T[]) {
  const out = new Map<string, WeekTitle[]>();
  if (ranked.length < 2) return out;
  const add = (id: string, t: WeekTitle) => out.set(id, [...(out.get(id) ?? []), t]);
  const top = pctOf(ranked[0]!);
  if (top > 0) ranked.filter((r) => pctOf(r) === top).forEach((r) => add(r.user_id, "Campeão"));
  const best = Math.max(...ranked.map((r) => r.streak));
  if (best > 0) ranked.filter((r) => r.streak === best).forEach((r) => add(r.user_id, "Muralha da constância"));
  ranked.filter((r) => r.comeback).forEach((r) => add(r.user_id, "Recomeço"));
  return out;
}

/** Champions of a finished week: everyone tied at the highest % (above 0) among 2+ members. */
export const weekChampions = (ranked: LeagueRow[]) => {
  if (ranked.length < 2) return [] as string[];
  const top = ranked[0]!;
  return pctOf(top) > 0 ? ranked.filter((r) => same(r, top)).map((r) => r.user_id) : [];
};

/** Months (yyyy-MM, by week start) with 3+ weekly wins. */
export function monthlyBadges(wins: string[]) {
  const by = new Map<string, number>();
  wins.forEach((w) => by.set(w.slice(0, 7), (by.get(w.slice(0, 7)) ?? 0) + 1));
  return [...by].filter(([, n]) => n >= 3).map(([m]) => m).sort();
}

/** Freezes still available (legacy; the league no longer grants freezes). */
export const freezesLeft = (wins: number, used: number) => Math.max(0, wins - used);
