import { describe, expect, it } from "vitest";
import { hasActivity, previousWeek, weekRange, weekStats } from "./weekly-digest";

describe("resumo semanal", () => {
  it("monta a semana de segunda a domingo", () => {
    const week = weekRange("2026-11-04"); // quarta
    expect(week.start).toBe("2026-11-02");
    expect(week.end).toBe("2026-11-08");
    expect(week.keys).toHaveLength(7);
  });
  it("a semana anterior termina no domingo passado", () => {
    const previous = previousWeek("2026-11-09"); // segunda
    expect(previous.start).toBe("2026-11-02");
    expect(previous.end).toBe("2026-11-08");
  });
  it("conta blocos, treinos, refeições e hábitos sem inventar dias", () => {
    const plan = {
      "2026-11-02": [{ kind: "treino", done: true }, { kind: "refeicao", done: true }, { kind: "compromisso", done: false }],
      "2026-11-03": [{ kind: "treino", done: false }],
    };
    const settings = { habitLog: { "2026-11-02": ["h1", "h2"], "2026-11-05": ["h1"] } };
    const stats = weekStats(plan, settings, weekRange("2026-11-04").keys);
    expect(stats).toEqual({ daysActive: 2, planned: 4, done: 2, workouts: 1, meals: 1, habits: 3 });
  });
  it("semana vazia não tem atividade", () => {
    const stats = weekStats({}, {}, weekRange("2026-11-04").keys);
    expect(stats.daysActive).toBe(0);
    expect(hasActivity(stats)).toBe(false);
  });
  it("ignora dados malformados", () => {
    const stats = weekStats(null, { habitLog: "errado" }, weekRange("2026-11-04").keys);
    expect(stats.planned).toBe(0);
    expect(hasActivity(stats)).toBe(false);
  });
});
