import type { LeagueRow } from "./xp";

/** Missing self is not a zero-percent competitor: keep it outside all ranking inputs. */
export function needsPersonalLeagueRow(rows: LeagueRow[], userId: string) {
  return !rows.some((row) => row.user_id === userId && row.week_pct != null);
}