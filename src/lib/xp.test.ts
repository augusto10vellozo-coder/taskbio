import { describe, expect, it } from "vitest";
import { brasiliaDay, cappedWeekXp, leaguePositions, leagueWeekStart, rankLeague, weekChampions, xpFor } from "./xp";

describe("pontos (XP)", () => {
  const today = "2026-10-16";
  it("vale 10 por hábito, 5 por bloco, 5 por refeição com item e 10 por treino", () => {
    expect(xpFor({ kind: "habit", date: today }, today)).toBe(5);
    expect(xpFor({ kind: "block", date: today }, today)).toBe(5);
    expect(xpFor({ kind: "meal", date: today, foodItems: 1 }, today)).toBe(5);
    expect(xpFor({ kind: "workout", date: today }, today)).toBe(15);
    expect(xpFor({ kind: "photo", date: today }, today)).toBe(5);
  });
  it("dia anterior dá 0 pontos", () => {
    expect(xpFor({ kind: "habit", date: "2026-10-15" }, today)).toBe(0);
  });
  it("refeição sem item da base dá 0 pontos", () => {
    expect(xpFor({ kind: "meal", date: today, foodItems: 0 }, today)).toBe(0);
  });
  it("usa o dia de Brasília", () => {
    expect(brasiliaDay(new Date("2026-10-17T02:30:00Z"))).toBe("2026-10-16");
  });
  it("limita 100 pontos por dia na liga", () => {
    expect(cappedWeekXp([{ day: "a", points: 80 }, { day: "a", points: 50 }, { day: "b", points: 20 }])).toBe(120);
  });
  it("semana da liga começa no domingo", () => {
    expect(leagueWeekStart("2026-10-16")).toBe("2026-10-11");
    expect(leagueWeekStart("2026-10-11")).toBe("2026-10-11");
  });
  it("ordena pela média percentual, não por XP", () => {
    const r = rankLeague([
      { user_id: "a", week_xp: 300, habit_days: 7, first_mark_sec: 100, week_pct: 0.5 },
      { user_id: "b", week_xp: 20, habit_days: 1, first_mark_sec: 900, week_pct: 0.87 },
      { user_id: "c", week_xp: 0, habit_days: 0, first_mark_sec: 0, week_pct: null },
    ]);
    expect(r.map((x) => x.user_id)).toEqual(["b", "a"]);
  });
  it("A com 3 módulos a 100% empata com B com 6 módulos a 100%", () => {
    const r = rankLeague([
      { user_id: "B", week_xp: 90, habit_days: 6, first_mark_sec: 100, week_pct: 6 / 6 },
      { user_id: "A", week_xp: 30, habit_days: 1, first_mark_sec: 900, week_pct: 3 / 3 },
    ]);
    expect(leaguePositions(r)).toEqual([1, 1]);
    expect(weekChampions(r).sort()).toEqual(["A", "B"]);
  });
  it("empate no % é decidido pela sequência de rotina", () => {
    const r = rankLeague([
      { user_id: "A", week_xp: 0, habit_days: 0, first_mark_sec: 0, week_pct: 1, streak_rotina: 2 },
      { user_id: "B", week_xp: 0, habit_days: 0, first_mark_sec: 0, week_pct: 1, streak_rotina: 5 },
    ]);
    expect(r.map((x) => x.user_id)).toEqual(["B", "A"]);
    expect(weekChampions(r)).toEqual(["B"]);
  });
});
