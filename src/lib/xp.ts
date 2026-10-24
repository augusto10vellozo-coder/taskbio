// Pure XP rules shared by the server function and tests.
export type XpKind = "habit" | "block" | "meal" | "workout" | "photo" | "reading" | "study";
export const XP_POINTS: Record<XpKind, number> = { habit: 10, block: 5, meal: 5, workout: 10, photo: 5, reading: 10, study: 5 };
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

export type WeekTitle = "Campeão" | "Muralha da constância" | "Recomeço";
/** Titles for an already-ranked league (needs 2+ members): 1st place, longest streak, came back after a missed day. */
export function weekTitles<T extends LeagueRow & { streak: number; comeback?: boolean }>(ranked: T[]) {
  const out = new Map<string, WeekTitle[]>();
  if (ranked.length < 2) return out;
  const add = (id: string, t: WeekTitle) => out.set(id, [...(out.get(id) ?? []), t]);
  const first = ranked[0]!;
  if (first.week_xp > 0) add(first.user_id, "Campeão");
  const best = Math.max(...ranked.map((r) => r.streak));
  if (best > 0) ranked.filter((r) => r.streak === best).forEach((r) => add(r.user_id, "Muralha da constância"));
  ranked.filter((r) => r.comeback).forEach((r) => add(r.user_id, "Recomeço"));
  return out;
}

/** Champion of a finished week: 1st place with XP among 2+ members. */
export const weekChampion = (ranked: LeagueRow[]) => (ranked.length >= 2 && ranked[0]!.week_xp > 0 ? ranked[0]!.user_id : null);

/** Months (yyyy-MM, by week start) with 3+ weekly wins. */
export function monthlyBadges(wins: string[]) {
  const by = new Map<string, number>();
  wins.forEach((w) => by.set(w.slice(0, 7), (by.get(w.slice(0, 7)) ?? 0) + 1));
  return [...by].filter(([, n]) => n >= 3).map(([m]) => m).sort();
}

/** Freezes still available: one per weekly win minus those already used. */
export const freezesLeft = (wins: number, used: number) => Math.max(0, wins - used);
