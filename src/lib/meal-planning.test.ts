import { describe, expect, it } from "vitest";
import { makePlannedMeal, consumePlannedMeal, skipPlannedMeal, mealsForMode, mealsForTotals, nextMealDate } from "./meal-planning";
import { mealSummary } from "./meal-summary";
import { normalizePlan } from "./calendar-utils";
import { saveMealRecord, unifyMealBlocks } from "./meal-link";
import type { Block } from "./trilha-data";

const food = { portion: "100 g", cost: 3, macros: { kcal: 720, prot: 24, carb: 118, gord: 16 }, items: [{ foodId: "rice", name: "Arroz", grams: 100, portion: "100 g", macros: { kcal: 720, prot: 24, carb: 118, gord: 16 } }] };
const planned = () => makePlannedMeal("plan-1", "Almoço", "Almoço", "12:00", food);
const sum = (blocks: Block[], mode: "planejar" | "registrar") => mealSummary(mealsForTotals(blocks, mode), () => undefined);
describe("meal planning", () => {
  it("keeps a Thursday plan out of real totals", () => {
    const plan = normalizePlan({ "2026-10-29": [planned()] });
    expect(sum(plan["2026-10-29"] ?? [], "planejar")).toMatchObject({ kcal: 720, prot: 24, carb: 118, gord: 16 });
    expect(sum(plan["2026-10-29"] ?? [], "registrar").kcal).toBe(0);
    expect(planned().manualMeal).toBeUndefined();
    expect(planned().mealId).toBeUndefined();
  });
  it("consumes the same ID once without duplicating foods", () => {
    const consumed = consumePlannedMeal(planned());
    expect(consumed.id).toBe("plan-1");
    expect(consumed.manualMeal?.items).toHaveLength(1);
    expect(consumePlannedMeal(consumed)).toEqual(consumed);
    expect(sum([consumed], "registrar").kcal).toBe(720);
  });
  it("keeps the original prediction after editing actual consumption", () => {
    const consumed = consumePlannedMeal(planned());
    const edited = saveMealRecord([consumed], { ...consumed, manualMeal: { ...food, macros: { ...food.macros, kcal: 650 } } }, consumed.id);
    expect(edited).toHaveLength(1);
    expect(sum(edited, "planejar").kcal).toBe(720);
    expect(sum(edited, "registrar").kcal).toBe(650);
    expect(edited[0]?.plannedMeal?.original.food.items[0]?.grams).toBe(100);
  });
  it("preserves legacy unplanned records even if not marked done", () => {
    const old: Block = { id: "old", kind: "refeicao", time: "12:00", title: "Almoço", done: false, manualMeal: food };
    expect(mealsForMode([old, planned()], "registrar")).toEqual([old]);
    expect(sum([old], "registrar").kcal).toBe(720);
  });
  it("keeps a new unplanned record separate from an identical plan", () => {
    const recorded: Block = { id: "actual", kind: "refeicao", time: "12:00", title: "Almoço", done: true, manualMeal: food };
    const blocks = saveMealRecord([planned()], recorded);
    expect(blocks).toHaveLength(2);
    expect(sum(blocks, "registrar").kcal).toBe(720);
    expect(blocks.find(b => b.id === "plan-1")?.plannedMeal?.state).toBe("planejada");
  });
  it("allows two lunches at the same time without merging", () => {
    expect(unifyMealBlocks([planned(), { ...planned(), id: "plan-2" }])).toHaveLength(2);
  });
  it("skipped meals count in neither total and remain visible in planning", () => {
    const skipped = skipPlannedMeal(planned());
    expect(skipped.plannedMeal?.state).toBe("pulada");
    expect(sum([skipped], "planejar").kcal).toBe(0);
    expect(sum([skipped], "registrar").kcal).toBe(0);
    expect(mealsForMode([skipped], "planejar")).toHaveLength(1);
  });
  it("repeats on the same weekday next week, always in the future", () => {
    expect(nextMealDate("2026-10-29", "2026-10-23")).toBe("2026-11-05");
    expect(nextMealDate("2026-10-15", "2026-10-23")).toBe("2026-10-29");
  });
  it("round-trips planned, consumed, skipped and legacy data", () => {
    const blocks = [planned(), consumePlannedMeal({ ...planned(), id: "consumed" }), skipPlannedMeal({ ...planned(), id: "skipped" })];
    const restored = normalizePlan(JSON.parse(JSON.stringify({ "2026-10-29": blocks })));
    expect(restored["2026-10-29"]).toEqual(blocks);
    expect(sum(restored["2026-10-29"] ?? [], "planejar").kcal).toBe(1440);
    expect(sum(restored["2026-10-29"] ?? [], "registrar").kcal).toBe(720);
  });
});