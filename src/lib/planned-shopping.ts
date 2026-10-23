import { normalizeItemName, normalizeUnit, SHOPPING_UNITS, type Block, type Plan, type ShoppingItem } from "./trilha-data";

export type ShoppingPeriod = { start: string; end: string };
type FoodItem = NonNullable<NonNullable<Block["manualMeal"]>["items"]>[number];

export function pendingPlannedMeals(plan: Plan, period: ShoppingPeriod): Block[] {
  if (!period.start || !period.end || period.start > period.end) return [];
  return Object.entries(plan).filter(([date]) => date >= period.start && date <= period.end)
    .flatMap(([, blocks]) => blocks.filter(b => b.kind === "refeicao" && b.plannedMeal?.state === "planejada"));
}

function quantity(item: FoodItem): { amount: number; unit: string } | null {
  if (item.shoppingAmount != null && item.shoppingUnit && SHOPPING_UNITS.some(u => u === normalizeUnit(item.shoppingUnit))) {
    return Number.isFinite(item.shoppingAmount) && item.shoppingAmount > 0 ? { amount: item.shoppingAmount, unit: normalizeUnit(item.shoppingUnit) } : null;
  }
  // Older picker records retain the explicit user-selected quantity in their portion.
  const portion = item.portion.trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:×\s*)?(un|unidade|unidades|kg|g|L|ml)(?:\s*\([\d.,]+ g\))?$/i);
  if (portion?.[1] && portion[2]) {
    const amount = Number(portion[1].replace(",", "."));
    if (amount > 0) return { amount, unit: normalizeUnit(portion[2]) };
  }
  return Number.isFinite(item.grams) && item.grams > 0 ? { amount: item.grams, unit: "g" } : null;
}

export function plannedShopping(plan: Plan, period: ShoppingPeriod) {
  const meals = pendingPlannedMeals(plan, period);
  const items = new Map<string, ShoppingItem>();
  let missing = 0;
  for (const meal of meals) {
    const foods = meal.plannedMeal?.original.food.items ?? [];
    if (!foods.length) missing++;
    for (const food of foods) {
      const q = quantity(food);
      if (!q || !food.name.trim()) { missing++; continue; }
      const key = `${normalizeItemName(food.name)}::${q.unit}`;
      const current = items.get(key);
      items.set(key, { id: `plan:${key}`, name: current?.name ?? food.name.replace(/\s+/g, " ").trim(), amount: (current?.amount ?? 0) + q.amount, unit: q.unit, checked: false, manual: false, source: "plan", planPeriod: { ...period } });
    }
  }
  return {
    meals: meals.length,
    cost: meals.reduce((sum, b) => sum + (b.plannedMeal?.original.food.cost ?? 0), 0),
    missing,
    items: [...items.values()].map(item => ({ ...item, amount: Math.round((item.amount + Number.EPSILON) * 100) / 100 }))
      .sort((a, b) => normalizeItemName(a.name).localeCompare(normalizeItemName(b.name)) || a.unit.localeCompare(b.unit)),
  };
}

const sameItem = (a: ShoppingItem, b: ShoppingItem) => normalizeItemName(a.name) === normalizeItemName(b.name) && normalizeUnit(a.unit) === normalizeUnit(b.unit);

export function applyPlannedShopping(existing: ShoppingItem[], generated: ShoppingItem[], action: "add" | "replace" | "refresh"): ShoppingItem[] {
  if (action === "replace") return generated.map(item => ({ ...item, checked: false }));
  if (action === "refresh") {
    const next = generated.map(item => {
      const previous = existing.find(old => old.source === "plan" && sameItem(old, item) && old.amount === item.amount);
      return { ...item, checked: previous?.checked ?? false };
    });
    return [...existing.filter(item => item.source !== "plan"), ...next];
  }
  const next = existing.map(item => ({ ...item }));
  for (const item of generated) {
    const index = next.findIndex(old => old.source === "plan" && sameItem(old, item));
    const previous = next[index];
    if (previous) next[index] = { ...item, id: previous.id, amount: Math.round((previous.amount + item.amount) * 100) / 100, checked: false };
    else next.push({ ...item, checked: false });
  }
  return next;
}