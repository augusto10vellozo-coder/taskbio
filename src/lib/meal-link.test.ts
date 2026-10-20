import { describe, expect, it } from "vitest";
import { saveMealRecord, unifyMealBlocks } from "./meal-link";
import type { Block } from "./trilha-data";

const appointment: Block = { id: "agenda", kind: "compromisso", title: "Café da manhã 10h", time: "10:00", done: false, reminderMinutes: 10 };
const record: Block = { id: "food", kind: "refeicao", title: "Café da manhã", time: "10:00", done: false, manualMeal: { portion: "1 prato", macros: { kcal: 420, prot: 25, carb: 40, gord: 17 }, cost: 6.5 } };
describe("shared meal records", () => {
  it("recognizes meal-named appointments with their scheduled time", () => {
    expect(unifyMealBlocks([appointment])[0]).toMatchObject({ id: "agenda", kind: "refeicao", time: "10:00", done: false });
  });
  it("completes the linked agenda record with the recorded calories", () => {
    const result = saveMealRecord([appointment], record);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "agenda", done: true, reminderMinutes: 10, manualMeal: { macros: { kcal: 420 } } });
  });
  it("adds a directly recorded meal once", () => {
    expect(saveMealRecord([], record)).toEqual([{ ...record, done: true }]);
  });
  it("merges legacy duplicates keeping the food-bearing ID and food", () => {
    const result = unifyMealBlocks([appointment, record]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "food", manualMeal: record.manualMeal, reminderMinutes: 10 });
    expect(unifyMealBlocks(result)).toEqual(result);
  });
  it("keeps other dates/times and unrelated appointments distinct", () => {
    expect(unifyMealBlocks([appointment, { ...record, time: "11:00" }, { ...appointment, id: "meeting", title: "Reunião no almoço" }])).toHaveLength(3);
  });
  it("preserves explicitly typed meals and edits without duplicates", () => {
    const typed = { ...appointment, kind: "refeicao" as const, title: "Pré-treino" };
    expect(unifyMealBlocks([typed])[0]).toEqual(typed);
    expect(saveMealRecord([typed], { ...record, title: "Pré-treino", time: "11:00" }, "agenda")).toMatchObject([{ id: "agenda", time: "11:00", done: true }]);
  });
});