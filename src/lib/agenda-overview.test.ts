import { describe, expect, it } from "vitest";
import { agendaSummary } from "./agenda-overview";
import { dayScore, goalProgress, streak } from "./engagement";
import type { Block } from "./trilha-data";

describe("agenda completion synchronization", () => {
  it("counts 3 daily items and 1 completed item", () => {
    const blocks: Block[] = [
      { id: "1", time: "08:00", kind: "treino", title: "Treino", done: true },
      { id: "2", time: "10:00", kind: "compromisso", title: "Estudar", done: false },
      { id: "3", time: "12:00", kind: "refeicao", title: "Almoço", done: false },
    ];
    expect(agendaSummary(blocks)).toMatchObject({ total: 3, completed: 1, workouts: 1, percent: 33 });
  });
  it("a completed timeline workout feeds score, streak and monthly progress from the same plan", () => {
    const date = "2026-10-13";
    const block: Block = { id: "w1", time: "18:00", kind: "treino", title: "Treino", done: false };
    expect(agendaSummary([block]).completed).toBe(0);
    const plan = { [date]: [{ ...block, done: true }] };
    expect(agendaSummary(plan[date])).toMatchObject({ completed: 1, workouts: 1, percent: 100 });
    expect(dayScore(plan, [], {}, date)).toBe(100);
    expect(streak(plan, {}, new Date(`${date}T12:00:00`))).toBe(1);
    expect(goalProgress({ id: "g", month: "2026-10", title: "Treinar", target: 12, unit: "treinos", source: "workouts", manual: 0 }, [], {}, plan)).toBe(1);
  });
});