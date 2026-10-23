import { addDays, parseISO } from "date-fns";
import type { Block } from "./trilha-data";
import { toDateKey } from "./calendar-utils";

export type MealMode = "planejar" | "registrar";
export const mealTypes = ["Café da manhã", "Almoço", "Jantar", "Lanche"] as const;

export function mealsForMode(blocks: Block[], mode: MealMode) {
  return blocks.filter(b => b.kind === "refeicao" && (mode === "planejar" ? !!b.plannedMeal : !b.plannedMeal || b.plannedMeal.state === "consumida"));
}

export function predictedMeal(block: Block): Block {
  const original = block.plannedMeal?.original;
  return original ? { ...block, title: original.title, time: original.time, manualMeal: original.food, mealId: undefined } : block;
}

export function mealsForTotals(blocks: Block[], mode: MealMode) {
  const meals = mealsForMode(blocks, mode);
  return mode === "planejar" ? meals.filter(b => b.plannedMeal?.state !== "pulada").map(predictedMeal) : meals;
}

export function makePlannedMeal(id: string, type: NonNullable<Block["plannedMeal"]>["type"], title: string, time: string, food: NonNullable<Block["manualMeal"]>): Block {
  return { id, kind: "refeicao", title, time, done: false, recurrence: "none", plannedMeal: { state: "planejada", type, original: { title, time, food: structuredClone(food) } } };
}

export function consumePlannedMeal(block: Block): Block {
  if (!block.plannedMeal || block.plannedMeal.state !== "planejada") return block;
  return { ...block, done: true, manualMeal: structuredClone(block.plannedMeal.original.food), plannedMeal: { ...block.plannedMeal, state: "consumida" } };
}

export function skipPlannedMeal(block: Block): Block {
  return block.plannedMeal?.state === "planejada" ? { ...block, done: false, plannedMeal: { ...block.plannedMeal, state: "pulada" } } : block;
}

export function nextMealDate(date: string, today: string) {
  let next = toDateKey(addDays(parseISO(date), 7));
  while (next <= today) next = toDateKey(addDays(parseISO(next), 7));
  return next;
}