import { addDays, parseISO } from "date-fns";
import type { Block, Plan } from "./trilha-data";
import { toDateKey } from "./calendar-utils";

export type MealMode = "planejar" | "registrar";
export const mealTypes = ["Café da manhã", "Almoço", "Jantar", "Lanche"] as const;

export function mealsForMode(blocks: Block[], mode: MealMode) {
  return blocks.filter(b => b.kind === "refeicao" && (mode === "planejar" ? !!b.plannedMeal : isMealRecorded(b)));
}

export function isMealRecorded(block: Block) {
  return block.kind === "refeicao" && (block.plannedMeal ? block.plannedMeal.state === "consumida" : !!block.manualMeal || block.done);
}

export function dayMealProgress(blocks: Block[]) {
  return { completed: mealsForMode(blocks, "registrar").length, total: blocks.filter(b => b.kind === "refeicao" && b.plannedMeal?.state !== "pulada").length };
}

/** Same-ID confirmation is pure and idempotent; it never awards XP. */
export function confirmMeal(block: Block, confirmedAt: string): Block {
  if (block.kind !== "refeicao" || isMealRecorded(block) || block.plannedMeal?.state === "pulada") return block;
  return { ...consumePlannedMeal(block), done: true, mealConfirmedAt: confirmedAt };
}

export function undoMealConfirmation(blocks: Block[], blockId: string): Block[] {
  return blocks.flatMap(block => {
    if (block.id !== blockId || !isMealRecorded(block)) return [block];
    if (!block.plannedMeal && block.manualMeal && !block.mealId) return [];
    const { manualMeal: _food, mealConfirmedAt: _at, ...rest } = block;
    return [{ ...rest, done: false, ...(block.plannedMeal ? { plannedMeal: { ...block.plannedMeal, state: "planejada" as const } } : {}) }];
  });
}

export function predictedMeal(block: Block): Block {
  const original = block.plannedMeal?.original;
  if (!original) return block;
  const { mealId: _mealId, ...rest } = block;
  return { ...rest, title: original.title, time: original.time, manualMeal: original.food };
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

export function copyPlannedMeals(blocks: Block[], id: () => string): Block[] {
  return blocks.flatMap(block => {
    const planned = block.plannedMeal;
    if (!planned) return [];
    return [makePlannedMeal(id(), planned.type, planned.original.title, planned.original.time, planned.original.food)];
  });
}

export function repeatPlannedDays(plan: Plan, blocks: Block[], dates: string[], id: () => string): Plan {
  const next = { ...plan };
  for (const date of new Set(dates)) {
    next[date] = [...(next[date] ?? []), ...copyPlannedMeals(blocks, id)].sort((a, b) => a.time.localeCompare(b.time));
  }
  return next;
}

export function copyPreviousMealWeek(plan: Plan, weekKeys: string[], replace: boolean, id: () => string): Plan {
  const next = { ...plan };
  for (const date of weekKeys) {
    const previous = toDateKey(addDays(parseISO(date), -7));
    const keep = (plan[date] ?? []).filter(block => !replace || !block.plannedMeal);
    next[date] = [...keep, ...copyPlannedMeals(plan[previous] ?? [], id)].sort((a, b) => a.time.localeCompare(b.time));
  }
  return next;
}