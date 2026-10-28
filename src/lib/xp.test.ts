import { describe, expect, it } from "vitest";
import { brasiliaDay, cappedWeekXp, leagueWeekStart, rankLeague, xpFor } from "./xp";

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
  it("desempata por dias com hábitos e depois por quem marcou primeiro", () => {
    const r = rankLeague([
      { user_id: "a", week_xp: 50, habit_days: 2, first_mark_sec: 100 },
      { user_id: "b", week_xp: 50, habit_days: 3, first_mark_sec: 900 },
      { user_id: "c", week_xp: 50, habit_days: 3, first_mark_sec: 300 },
    ]);
    expect(r.map((x) => x.user_id)).toEqual(["c", "b", "a"]);
  });
});
