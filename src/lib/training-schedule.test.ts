import { describe, expect, it } from "vitest";
import { DEFAULT_WORKOUT_TIME, findWorkoutBlock, largestFreeGap, withWorkoutBlock, workoutTimeFor } from "./training-schedule";
import type { Block, Plan } from "./trilha-data";

const block = (over: Partial<Block> & Pick<Block, "id" | "time">): Block => ({ kind: "treino", title: "Treino", done: false, ...over });

describe("agendamento de treino", () => {
  it("encontra apenas o bloco de treino do dia", () => {
    const plan: Plan = { "2026-11-05": [block({ id: "a", time: "07:00" }), { id: "m", time: "12:00", kind: "refeicao", title: "Almoço", done: false }] };
    expect(findWorkoutBlock("2026-11-05", plan)?.id).toBe("a");
    expect(findWorkoutBlock("2026-11-06", plan)).toBeUndefined();
  });

  it("preserva o horário do treino que está sendo substituído", () => {
    expect(workoutTimeFor("2026-11-05", {}, block({ id: "a", time: "18:30" }))).toBe("18:30");
  });

  it("herda o último horário usado no mesmo dia da semana", () => {
    const plan: Plan = {
      "2026-10-29": [block({ id: "thu", time: "06:15" })],
      "2026-10-30": [block({ id: "fri", time: "20:00" })],
      "2026-11-05": [],
    };
    expect(workoutTimeFor("2026-11-05", plan)).toBe("06:15");
  });

  it("usa 07:00 quando não há histórico", () => {
    expect(workoutTimeFor("2026-11-05", {})).toBe(DEFAULT_WORKOUT_TIME);
  });

  it("substitui só o bloco indicado e mantém a ordem por horário", () => {
    const blocks: Block[] = [
      block({ id: "old", time: "07:00" }),
      { id: "meal", time: "12:00", kind: "refeicao", title: "Almoço", done: false },
    ];
    const next = withWorkoutBlock(blocks, block({ id: "new", time: "06:00" }), "old");
    expect(next.map((item) => item.id)).toEqual(["new", "meal"]);
  });

  it("nunca apaga blocos de outros tipos", () => {
    const blocks: Block[] = [
      block({ id: "old", time: "07:00" }),
      { id: "study", time: "19:00", kind: "compromisso", title: "Estudar", done: false },
    ];
    const next = withWorkoutBlock(blocks, block({ id: "new", time: "08:00" }), "old");
    expect(next.some((item) => item.id === "study")).toBe(true);
  });

  it("encontra o maior intervalo livre do dia", () => {
    const blocks: Block[] = [
      { id: "a", time: "07:00", kind: "refeicao", title: "Café", done: false },
      { id: "b", time: "08:00", endTime: "12:00", kind: "compromisso", title: "Estudo", done: false },
      { id: "c", time: "19:00", kind: "treino", title: "Treino", done: false },
    ];
    expect(largestFreeGap(blocks)).toBe(7 * 60);
  });

  it("sem blocos, o dia inteiro está livre", () => {
    expect(largestFreeGap([])).toBe(17 * 60);
  });
});
