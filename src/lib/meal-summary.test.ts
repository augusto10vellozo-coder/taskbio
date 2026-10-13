import { describe, expect, it } from "vitest";
import { mealSummary } from "./meal-summary";
import { MEALS, type Block } from "./trilha-data";

const lookup = (id?: string) => MEALS.find((m) => m.id === id);
const manual: Block = { id: "manual", time: "12:00", kind: "refeicao", title: "Almoço", done: false, manualMeal: { portion: "300g", cost: 2.26, macros: { kcal: 350, prot: 20, carb: 40, gord: 12 } } };
describe("meal summaries", () => {
  it("sums calories and all macros for manual and catalog meals regardless of completion", () => {
    expect(mealSummary([manual, { id: "catalog", time: "07:00", kind: "refeicao", title: "Café", mealId: "m1", done: true }], lookup)).toEqual({ kcal: 770, prot: 45, carb: 80, gord: 29, cost: 8.76, missing: 0, known: 2 });
  });
  it("updates the daily and weekly totals when a meal is removed", () => {
    expect(mealSummary([manual], lookup).kcal).toBe(350);
    expect(mealSummary([], lookup)).toEqual({ kcal: 0, prot: 0, carb: 0, gord: 0, cost: 0, missing: 0, known: 0 });
  });
  it("keeps costs and flags missing nutrition rather than fabricating numbers", () => {
    const missing = { ...manual, manualMeal: { ...manual.manualMeal, portion: "300g", cost: 2.26, macros: { kcal: 0, prot: 0, carb: 0, gord: 0 } } };
    expect(mealSummary([missing], lookup)).toEqual({ kcal: 0, prot: 0, carb: 0, gord: 0, cost: 2.26, missing: 1, known: 0 });
  });
});