import { describe, expect, it } from "vitest";
import { exerciseHistory, exerciseKey, progression, recordExerciseSets, toWorkout, weeklyMax } from "./training";
import { goalProgress } from "./engagement";

describe("training", () => {
  const workout = toWorkout({ day: null, name: "Costas", exercises: [{ name: "Remada no TRX", sets: 3, reps: 12, loadKg: null }, { name: "Supino", sets: 3, reps: 8, loadKg: 40 }, { name: "Novo", sets: 3, reps: 10, loadKg: 20 }] }, [], "partial");
  it("retains every independently recorded exercise across weeks without workout completion", () => {
    const first = workout.exercises[0];
    const second = workout.exercises[1];
    if (!first || !second) throw new Error("Missing fixture");
    let log = recordExerciseSets([], workout, first.id, 1, "2026-10-12");
    log = recordExerciseSets(log, workout, second.id, 1, "2026-10-12");
    expect(exerciseHistory("Remada no TRX", log, [], [], {}, "2026-10-19")[0]).toEqual({ date: "2026-10-12", loadKg: 0, reps: 12 });
    expect(exerciseHistory("Supino", log, [], [], {}, "2026-10-19")[0]).toEqual({ date: "2026-10-12", loadKg: 40, reps: 8 });
  });
  it("does not invent history from planned or imported exercises", () => {
    expect(exerciseHistory("Novo", [], [], [workout], { "2026-10-12": [{ id: "b", kind: "treino", time: "07:00", title: "Costas", workoutId: workout.id, done: false }] })).toEqual([]);
  });
  it("dated series never create legacy history for another planned day", () => {
    const dated = { ...workout, exercises: workout.exercises.map((e, i) => ({ ...e, doneSets: i === 0 ? 1 : 0, seriesByDate: { "2026-10-12": [{ done: i === 0 }] } })) };
    const plan = { "2026-10-12": [{ id: "a", kind: "treino" as const, time: "07:00", title: "Costas", workoutId: dated.id, done: false }], "2026-10-19": [{ id: "b", kind: "treino" as const, time: "07:00", title: "Costas", workoutId: dated.id, done: false }] };
    expect(exerciseHistory("Remada no TRX", [], [], [dated], plan).map(e => e.date)).toEqual(["2026-10-12"]);
  });
  it("keeps bodyweight session repetitions in history", () => {
    expect(exerciseHistory("Remada no TRX", [], [{ completedAt: "2026-10-12T10:00:00Z", exercises: [{ name: "Remada no TRX", loadKg: 0, reps: 12 }] }] as never)[0]).toEqual({ date: "2026-10-12", loadKg: 0, reps: 12 });
  });
  it("matches case accents and extra spaces in actual records", () => {
    expect(exerciseHistory(" ELEVAÇÃO   LATERAL ", [{ id: "r", date: "2026-10-12", exercise: "elevacao lateral", loadKg: 8, reps: 12, sets: 3 }], [])[0]?.loadKg).toBe(8);
  });
  it("recovers marked legacy sets without requiring a finished workout", () => {
    const partial = { ...workout, exercises: workout.exercises.map((e, i) => ({ ...e, doneSets: i === 0 ? 1 : 0 })) };
    const plan = { "2026-10-12": [{ id: "b", kind: "treino" as const, time: "07:00", title: "Costas", workoutId: partial.id, done: false }] };
    expect(exerciseHistory("remada no trx", [], [], [partial], plan)[0]?.reps).toBe(12);
    expect(exerciseHistory("Supino", [], [], [partial], plan)).toEqual([]);
  });
  it("updates a set record without multiplying it and ignores future entries", () => {
    const ex = workout.exercises[0];
    if (!ex) throw new Error("Missing fixture");
    const log = recordExerciseSets(recordExerciseSets([], workout, ex.id, 1, "2026-10-26"), workout, ex.id, 2, "2026-10-26");
    expect(log).toHaveLength(1);
    expect(log[0]?.sets).toBe(2);
    expect(exerciseHistory(ex.name, log, [], [], {}, "2026-10-19")).toEqual([]);
  });
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
