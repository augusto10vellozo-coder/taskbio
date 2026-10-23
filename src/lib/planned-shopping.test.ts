import { describe, expect, it } from "vitest";
import { applyPlannedShopping, plannedShopping } from "./planned-shopping";
import { makePlannedMeal, consumePlannedMeal, skipPlannedMeal } from "./meal-planning";
import { SHOPPING_UNITS, type ShoppingItem } from "./trilha-data";
const period = { start: "2026-10-19", end: "2026-10-25" };
const macros = { kcal: 140, prot: 12, carb: 1, gord: 10 };
const meal = (id: string, amount: number, name = "Ovo", unit = "un") => makePlannedMeal(id, "Almoço", "Almoço", "12:00", { portion: `${amount} ${unit}`, cost: 0, macros, items: [{ name, grams: amount * 50, portion: `${amount} ${unit}`, macros }] });
const manual: ShoppingItem = { id: "personal", name: "Sabonete", amount: 1, unit: "un", checked: true, manual: true };
const generated = () => plannedShopping({ "2026-10-19": [meal("a", 2), meal("b", 4)] }, period).items;
describe("planned shopping", () => {
  it("sums 2 and 4 eggs to 6 units in preview", () => {
    expect(generated()).toMatchObject([{ name: "Ovo", amount: 6, unit: "un", checked: false, source: "plan" }]);
  });
  it("excludes consumed and skipped meals", () => {
    const output = plannedShopping({ "2026-10-19": [meal("a", 2), consumePlannedMeal(meal("b", 4)), skipPlannedMeal(meal("c", 8))] }, period);
    expect(output.meals).toBe(1);
    expect(output.items[0]?.amount).toBe(2);
  });
  it("separates 500g and 2 units of tomato", () => {
    const output = plannedShopping({ "2026-10-19": [meal("a", 500, "Tomate", "g"), meal("b", 2, "Tomate")] }, period);
    expect(output.items.map(i => [i.amount, i.unit])).toEqual([[500, "g"], [2, "un"]]);
  });
  it("normalizes names and rounds fractional sums to two decimals", () => {
    const output = plannedShopping({ "2026-10-19": [meal("a", 0.125, " FEIJÃO  branco ", "kg"), meal("b", 0.126, "feijao branco", "kg")] }, period);
    expect(output.items).toHaveLength(1);
    expect(output.items[0]?.amount).toBe(0.25);
  });
  it("add preserves a manual item even with the same food name", () => {
    const same = { ...manual, name: "Ovo" };
    const output = applyPlannedShopping([same], generated(), "add");
    expect(output[0]).toEqual(same);
    expect(output).toHaveLength(2);
  });
  it("generated entries are pending and use only fixed units", () => {
    const output = applyPlannedShopping([], generated(), "replace");
    expect(output.every(i => !i.checked && SHOPPING_UNITS.some(u => u === i.unit))).toBe(true);
  });
  it("refresh preserves manual entries and checked unchanged ingredients", () => {
    const existing = [manual, ...generated().map(i => ({ ...i, checked: true }))];
    const output = applyPlannedShopping(existing, generated(), "refresh");
    expect(output[0]).toEqual(manual);
    expect(output[1]?.checked).toBe(true);
  });
  it("changed quantities are pending but unchanged manual state survives", () => {
    const existing = [manual, ...generated().map(i => ({ ...i, checked: true }))];
    const next = plannedShopping({ "2026-10-19": [meal("more", 8)] }, period).items;
    expect(applyPlannedShopping(existing, next, "refresh")).toMatchObject([manual, { amount: 8, checked: false }]);
  });
  it("planning extra meals alone does not mutate the existing list", () => {
    const existing = generated();
    const snapshot = structuredClone(existing);
    plannedShopping({ "2026-10-19": [meal("extra", 8)] }, period);
    expect(existing).toEqual(snapshot);
    expect(existing[0]?.amount).toBe(6);
  });
  it("uses chosen dates inclusively and excludes outside meals", () => {
    expect(plannedShopping({ "2026-10-18": [meal("old", 9)], "2026-10-19": [meal("start", 2)], "2026-10-25": [meal("end", 4)], "2026-10-26": [meal("next", 8)] }, period).items[0]?.amount).toBe(6);
  });
  it("does not invent item costs from a meal cost", () => {
    const block = meal("a", 2);
    if (block.plannedMeal) block.plannedMeal.original.food.cost = 7;
    const output = plannedShopping({ "2026-10-19": [block] }, period);
    expect(output.cost).toBe(7);
    expect(output.items[0]?.estimatedCost).toBeUndefined();
  });
});