import { describe, expect, it } from "vitest";
import { confirmMeal, dayMealProgress, isMealRecorded, makePlannedMeal, mealsForTotals, predictedMeal, undoMealConfirmation } from "./meal-planning";
import { mealNutrition, mealSummary } from "./meal-summary";
import type { Block } from "./trilha-data";

const food = { portion: "1 prato", cost: 12.5, macros: { kcal: 620, prot: 40, carb: 70, gord: 20 }, items: [{ foodId: "rice", name: "Arroz", grams: 100, portion: "100 g", macros: { kcal: 620, prot: 40, carb: 70, gord: 20 } }] };
const lunch = () => makePlannedMeal("lunch", "Almoço", "Almoço", "12:00", food);
const at = "2026-10-28T14:30:00Z";

describe("Agenda shared meal confirmation", () => {
  it("registers the planned 620 kcal and items on the same ID", () => {
    const recorded = confirmMeal(lunch(), at);
    expect(recorded).toMatchObject({ id: "lunch", done: true, mealConfirmedAt: at, manualMeal: food });
    expect(mealSummary(mealsForTotals([recorded], "registrar"), () => undefined).kcal).toBe(620);
  });
  it("does not duplicate or replace the original confirmation on a second call", () => {
    const recorded = confirmMeal(lunch(), at);
    expect(confirmMeal(recorded, "2026-10-28T15:00:00Z")).toBe(recorded);
    expect(dayMealProgress([confirmMeal(recorded, at)]).completed).toBe(1);
  });
  it("undo removes consumption but preserves the plan and items", () => {
    const [restored] = undoMealConfirmation([confirmMeal(lunch(), at)], "lunch");
    expect(restored?.plannedMeal).toEqual(lunch().plannedMeal);
    expect(restored?.manualMeal).toBeUndefined();
    expect(restored?.mealConfirmedAt).toBeUndefined();
    expect(mealsForTotals(restored ? [restored] : [], "registrar")).toHaveLength(0);
  });
  it("allows a partial meal without inventing nutrition", () => {
    const partial: Block = { id: "partial", kind: "refeicao", title: "Almoço", time: "12:00", done: false };
    const recorded = confirmMeal(partial, at);
    expect(isMealRecorded(recorded)).toBe(true);
    expect(mealNutrition(recorded, () => undefined).known).toBe(false);
  });
  it("uses planned totals of 620 kcal and R$12.50 before confirmation", () => {
    expect(mealNutrition(predictedMeal(lunch()), () => undefined)).toMatchObject({ kcal: 620, cost: 12.5, known: true });
  });
  it("counts one confirmed meal out of three using the Alimentacao selector", () => {
    const blocks = [confirmMeal(lunch(), at), { ...lunch(), id: "dinner" }, { ...lunch(), id: "breakfast" }];
    expect(dayMealProgress(blocks)).toEqual({ completed: 1, total: 3 });
  });
  it("recognizes legacy unplanned food regardless of its old check", () => {
    const avulsa: Block = { id: "legacy", title: "Lanche", time: "16:00", kind: "refeicao", manualMeal: food, done: false };
    expect(isMealRecorded(avulsa)).toBe(true);
    expect(undoMealConfirmation([avulsa, lunch()], "legacy")).toEqual([lunch()]);
  });
  it("does not count a bare pending Agenda placeholder as a food record", () => {
    const block: Block = { id: "pending", title: "Almoço", time: "12:00", kind: "refeicao", done: false };
    expect(mealsForTotals([block], "registrar")).toHaveLength(0);
  });
});