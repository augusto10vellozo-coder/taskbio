import { describe, expect, it } from "vitest";
import { freezesLeft, monthlyBadges, weekChampions, weekTitles } from "./xp";
import { streak } from "./engagement";

const row = (user_id: string, pct: number, streak = 0, comeback = false) => ({ user_id, week_xp: 0, week_pct: pct / 100, habit_days: 0, first_mark_sec: 0, streak, comeback });

describe("league awards", () => {
  it("1st place is champion only with 2+ members and XP", () => {
    expect(weekChampions([row("a", 50), row("b", 10)])).toEqual(["a"]);
    expect(weekChampions([row("a", 50)])).toEqual([]);
    expect(weekChampions([row("a", 0), row("b", 0)])).toEqual([]);
  });
  it("titles: Campeão, Muralha da constância, Recomeço", () => {
    const t = weekTitles([row("a", 50, 2), row("b", 10, 9, true)]);
    expect(t.get("a")).toEqual(["Campeão"]);
    expect(t.get("b")).toEqual(["Muralha da constância", "Recomeço"]);
  });
  it("3 wins in the same month give a badge", () => {
    expect(monthlyBadges(["2026-10-04", "2026-10-11", "2026-10-18", "2026-11-01"])).toEqual(["2026-10"]);
    expect(monthlyBadges(["2026-10-04", "2026-10-11"])).toEqual([]);
  });
  it("one freeze per win", () => expect(freezesLeft(2, 1)).toBe(1));
  it("a frozen missed day keeps the streak", () => {
    const log = { "2026-10-13": ["h"], "2026-10-15": ["h"] };
    const today = new Date("2026-10-15T12:00:00");
    expect(streak({}, log, today)).toBe(1);
    expect(streak({}, log, today, undefined, new Set(["2026-10-14"]))).toBe(3);
  });
});
