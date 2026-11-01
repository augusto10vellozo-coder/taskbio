import { describe, expect, it } from "vitest";
import { dayScore, goalProgress, goalPercent, greeting, isMilestone, streak } from "./engagement";
import type { Block } from "./trilha-data";

const b = (done: boolean): Block => ({ id: Math.random().toString(), time: "08:00", kind: "compromisso", title: "x", done });

describe("engagement", () => {
  it("greets by hour", () => {
    expect(greeting(8)).toBe("Bom dia");
    expect(greeting(14)).toBe("Boa tarde");
    expect(greeting(21)).toBe("Boa noite");
  });
  it("day score counts blocks and habits", () => {
    const plan = { "2026-10-13": [b(true), b(false)] };
    const habits = [{ id: "h1", name: "Ler", createdAt: "" }, { id: "h2", name: "Água", createdAt: "" }];
    expect(dayScore(plan, habits, { "2026-10-13": ["h1"] }, "2026-10-13")).toBe(50);
  });
  it("streak counts consecutive days including habits", () => {
    const plan = { "2026-10-12": [b(true)] };
    const log = { "2026-10-13": ["h1"], "2026-10-11": ["h1"], "2026-10-09": ["h1"] };
    expect(streak(plan, log, new Date("2026-10-13T12:00:00"))).toBe(3);
  });
  it("streak continues from yesterday when today is empty", () => {
    expect(streak({}, { "2026-10-12": ["h"] }, new Date("2026-10-13T12:00:00"))).toBe(1);
  });
  it("habits excluded from the streak do not count", () => {
    const habits = [{ id: "a", name: "A", createdAt: "", countsForStreak: false }, { id: "b", name: "B", createdAt: "" }];
    const today = new Date("2026-10-13T12:00:00");
    expect(streak({}, { "2026-10-13": ["a"] }, today, habits)).toBe(0);
    expect(streak({}, { "2026-10-13": ["b"] }, today, habits)).toBe(1);
  });
  it("milestones at 7, 14 and 30", () => {
    expect([5, 10, 20, 30, 50].every(isMilestone)).toBe(true);
    expect(isMilestone(8)).toBe(false);
  });
  it("workout goals count completed workouts of the month", () => {
    const g = { id: "g", month: "2026-10", title: "Treinar", target: 12, unit: "treinos", source: "workouts" as const, manual: 0 };
    const h = [{ completedAt: "2026-10-02T10:00:00Z" }, { completedAt: "2026-09-30T10:00:00Z" }] as never;
    expect(goalProgress(g, h, {})).toBe(1);
    expect(goalPercent(6, 12)).toBe(50);
    expect(goalPercent(20, 12)).toBe(100);
  });
});
