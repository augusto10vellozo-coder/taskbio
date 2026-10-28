import { describe, expect, it } from "vitest";
import { needsPersonalLeagueRow } from "./league-self";
import { leaguePositions, rankLeague } from "./xp";

const member = (user_id: string, week_pct: number | null) => ({ user_id, week_pct, week_xp: 0, habit_days: 0, first_mark_sec: 0 });

describe("own league visibility", () => {
  it("shows missing self outside the ranking without adding other missing users", () => {
    const rows = rankLeague([member("A", 1), member("B", 1), member("C", null)]);
    expect(needsPersonalLeagueRow(rows, "C")).toBe(true);
    expect(rows.map((r) => r.user_id)).toEqual(["A", "B"]);
    expect(leaguePositions(rows)).toEqual([1, 1]);
  });
  it("keeps self with planned blocks and zero completion in the ranking", () => {
    expect(needsPersonalLeagueRow([member("C", 0)], "C")).toBe(false);
  });
  it("shows the own row even when the league is empty", () => {
    expect(needsPersonalLeagueRow([], "C")).toBe(true);
  });
});