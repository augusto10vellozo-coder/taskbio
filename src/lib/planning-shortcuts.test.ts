import { describe, expect, it } from "vitest";
import { copyPreviousMealWeek, repeatPlannedDays, makePlannedMeal, consumePlannedMeal, skipPlannedMeal } from "./meal-planning";
import type { Block, Plan } from "./trilha-data";
const food = { portion: "Ovo 2 un", cost: 0, macros: { kcal: 140, prot: 12, carb: 1, gord: 10 }, items: [{ name: "Ovo", grams: 100, portion: "2 un", macros: { kcal: 140, prot: 12, carb: 1, gord: 10 } }] };
const meal = (id: string) => makePlannedMeal(id, "Almoço", "Almoço", "12:00", food);
let count = 0;
const id = () => `copy-${++count}`;
describe("planning shortcuts", () => {
  it("repeats a meal into three chosen days preserving type and quantities", () => {
    const days = ["2026-10-20", "2026-10-21", "2026-10-22"];
    const next = repeatPlannedDays({}, [meal("one")], days, id);
    expect(days.map(d => next[d]?.length)).toEqual([1, 1, 1]);
    expect(new Set(days.map(d => next[d]?.[0]?.id)).size).toBe(3);
    expect(next[days[0] ?? ""]?.[0]?.plannedMeal).toMatchObject({ state: "planejada", type: "Almoço", original: { food } });
  });
  it("copies the previous week including consumed/skipped as new planned meals", () => {
    const next = copyPreviousMealWeek({ "2026-10-12": [consumePlannedMeal(meal("one")), skipPlannedMeal(meal("two"))] }, ["2026-10-19"], false, id);
    expect(next["2026-10-19"]).toHaveLength(2);
    expect(next["2026-10-19"]?.map(b => [b.plannedMeal?.state, b.done, b.manualMeal])).toEqual([["planejada", false, undefined], ["planejada", false, undefined]]);
  });
  it("copies a day additively and never overwrites an occupied destination", () => {
    const plan = { "2026-10-19": [meal("existing")] };
    expect(repeatPlannedDays(plan, [meal("source")], ["2026-10-19"], id)["2026-10-19"]).toHaveLength(2);
    expect(plan["2026-10-19"]).toHaveLength(1);
  });
  it("duplicates on the same day with a new ID and independent snapshot", () => {
    const original = meal("original");
    const next = repeatPlannedDays({ "2026-10-19": [original] }, [original], ["2026-10-19"], id);
    const copied = next["2026-10-19"]?.[1];
    expect(copied?.id).not.toBe(original.id);
    expect(copied?.plannedMeal?.original.food).toEqual(food);
    expect(copied?.plannedMeal?.original.food).not.toBe(original.plannedMeal?.original.food);
  });
  it("replace week preserves unplanned consumption and nonmeal blocks", () => {
    const legacy: Block = { id: "legacy", kind: "refeicao", title: "Avulsa", time: "12:00", done: true, manualMeal: food };
    const task: Block = { id: "task", kind: "compromisso", title: "Consulta", time: "10:00", done: false };
    const plan: Plan = { "2026-10-12": [meal("source")], "2026-10-19": [meal("old"), legacy, task] };
    const next = copyPreviousMealWeek(plan, ["2026-10-19"], true, id);
    expect(next["2026-10-19"]?.map(b => b.id)).toContain("legacy");
    expect(next["2026-10-19"]?.map(b => b.id)).toContain("task");
    expect(next["2026-10-19"]?.map(b => b.id)).not.toContain("old");
  });
});