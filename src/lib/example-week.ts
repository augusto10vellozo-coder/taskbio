import type { Block } from "./trilha-data";

/**
 * Editable starter week used by the empty states and the onboarding.
 * Mirrors the old example offered inside /agenda so there is a single source.
 */
const EXAMPLE_WEEK: Array<Array<Omit<Block, "id">>> = [
  [{ time: "07:30", kind: "refeicao", title: "Café da manhã", mealId: "m1", done: false }, { time: "18:00", kind: "treino", title: "Caminhada leve", done: false }],
  [{ time: "12:30", kind: "refeicao", title: "Almoço", mealId: "m2", done: false }],
  [{ time: "07:30", kind: "refeicao", title: "Café da manhã", mealId: "m1", done: false }, { time: "18:00", kind: "treino", title: "Mobilidade", done: false }],
  [{ time: "19:00", kind: "descanso", title: "Descanso", done: false }],
  [{ time: "12:30", kind: "refeicao", title: "Almoço", mealId: "m2", done: false }, { time: "18:00", kind: "treino", title: "Caminhada leve", done: false }],
  [{ time: "09:00", kind: "treino", title: "Atividade ao ar livre", done: false }],
  [{ time: "09:00", kind: "descanso", title: "Descanso", done: false }],
];

/** Plan entries for the given 7 date keys, with fresh ids. */
export function exampleWeek(weekKeys: string[]): Record<string, Block[]> {
  return Object.fromEntries(
    weekKeys.map((key, index) => [key, (EXAMPLE_WEEK[index] ?? []).map((block) => ({ ...block, id: crypto.randomUUID() }))]),
  );
}
