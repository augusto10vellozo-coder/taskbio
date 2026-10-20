import type { Block } from "./trilha-data";

const normalize = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
// Allow a time suffix, but do not turn unrelated appointments into meals.
export function mealNameKey(name: string) {
  return normalize(name).replace(/\s*(?:[-–·]|as|às)?\s*\d{1,2}(?:h(?:\d{2})?|:\d{2})\s*$/, "").trim();
}
export function isMealAppointment(block: Pick<Block, "kind" | "title">) {
  return block.kind === "refeicao" || (block.kind === "compromisso" && /^(cafe da manha|almoco|lanche(?: da (?:manha|tarde|noite))?|jantar)$/.test(mealNameKey(block.title)));
}
const foodRank = (block: Block) => block.manualMeal ? 2 : block.mealId ? 1 : 0;

/** One dated block is shared by Agenda and Alimentação; food-bearing IDs survive migration. */
export function unifyMealBlocks(blocks: Block[]): Block[] {
  const result: Block[] = [];
  for (const original of blocks) {
    const block = isMealAppointment(original) ? { ...original, kind: "refeicao" as const } : original;
    const index = block.kind === "refeicao" ? result.findIndex((other) => other.kind === "refeicao" && other.time === block.time && mealNameKey(other.title) === mealNameKey(block.title)) : -1;
    if (index < 0) { result.push(block); continue; }
    const previous = result[index];
    if (!previous) continue;
    const winner = foodRank(block) > foodRank(previous) ? block : previous;
    const other = winner === block ? previous : block;
    result[index] = { ...other, ...winner, note: winner.note ?? other.note, reminderMinutes: winner.reminderMinutes ?? other.reminderMinutes, endTime: winner.endTime ?? other.endTime, photoPath: winner.photoPath ?? other.photoPath, done: winner.done || other.done };
  }
  return result.sort((a, b) => a.time.localeCompare(b.time));
}

export function saveMealRecord(blocks: Block[], record: Block, editingId?: string) {
  const current = unifyMealBlocks(blocks);
  const linked = editingId ? current.find((block) => block.id === editingId) : current.find((block) => block.kind === "refeicao" && block.time === record.time && mealNameKey(block.title) === mealNameKey(record.title));
  const saved: Block = { ...linked, ...record, id: linked?.id ?? record.id, done: true };
  return unifyMealBlocks([...current.filter((block) => block.id !== saved.id), saved]);
}