import { describe, expect, it } from "vitest";
import { exerciseHistory, exerciseKey, progression, toWorkout, weeklyMax } from "./training";
import { goalProgress } from "./engagement";

describe("training", () => {
  it("links exercise names regardless of accents and case", () => {
    expect(exerciseKey("Supino Inclinado")).toBe(exerciseKey("supino  inclinado"));
    expect(exerciseKey("Elevação lateral")).toBe("elevacao lateral");
  });
  it("merges logs and finished sessions, newest first", () => {
    const h = exerciseHistory("Supino", [{ id: "1", date: "2026-10-10", exercise: "supino", loadKg: 42.5, reps: 8, sets: 3 }],
      [{ completedAt: "2026-10-03T10:00:00Z", exercises: [{ name: "Supino", loadKg: 40, reps: 10 }] }] as never);
    expect(h[0]).toEqual({ date: "2026-10-10", loadKg: 42.5, reps: 8 });
    expect(progression(h)).toBe(2.5);
  });
  it("no progression with a single record or lower load", () => {
    expect(progression([{ loadKg: 40 }])).toBe(0);
    expect(progression([{ loadKg: 37.5 }, { loadKg: 40 }])).toBe(-2.5);
  });
  it("weekly max covers 8 weeks", () => {
    const w = weeklyMax([{ date: "2026-10-13", loadKg: 40 }, { date: "2026-10-14", loadKg: 45 }], new Date("2026-10-15T12:00:00"));
    expect(w).toHaveLength(8);
    expect(w[7]!.kg).toBe(45);
    expect(w[0]!.kg).toBeNull();
  });
  it("imported exercises reuse existing names to keep progression", () => {
    const wk = toWorkout({ day: "seg", name: "Peito", exercises: [{ name: "SUPINO RETO", sets: 3, reps: 10, loadKg: 40 }] }, ["Supino reto"], "w");
    expect(wk.exercises[0]!.name).toBe("Supino reto");
    expect(wk.exercises[0]!.loadKg).toBe(40);
  });
  it("month goal counts completed workout blocks without double counting sessions", () => {
    const g = { id: "g", month: "2026-10", title: "Treinar", target: 12, unit: "treinos", source: "workouts" as const, manual: 0 };
    const plan = { "2026-10-05": [{ id: "a", time: "07:00", kind: "treino" as const, title: "Peito", done: true }], "2026-10-06": [{ id: "b", time: "07:00", kind: "treino" as const, title: "Costas", done: false }] };
    const hist = [{ completedAt: "2026-10-05T08:00:00" }, { completedAt: "2026-10-08T08:00:00" }] as never;
    expect(goalProgress(g, hist, {}, plan)).toBe(2);
  });
});
