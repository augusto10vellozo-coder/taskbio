import type { Block } from "./trilha-data";

export function agendaSummary(blocks: Block[]) {
  const completed = blocks.filter((block) => block.done).length;
  return {
    total: blocks.length,
    completed,
    percent: blocks.length ? Math.round(completed / blocks.length * 100) : 0,
    workouts: blocks.filter((block) => block.kind === "treino" && block.done).length,
    meals: blocks.filter((block) => block.kind === "refeicao" && block.done).length,
  };
}