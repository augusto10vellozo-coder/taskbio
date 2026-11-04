import type { Block, Plan } from "./trilha-data";

export const DEFAULT_WORKOUT_TIME = "07:00";

/** Dia da semana (0-6) de uma chave yyyy-MM-dd, imune a fuso horário. */
export function weekdayOf(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00`).getDay();
}

/** O treino do dia, se houver. Nunca remove nada. */
export function findWorkoutBlock(dateKey: string, plan: Plan): Block | undefined {
  return (plan[dateKey] ?? []).find((block) => block.kind === "treino");
}

/**
 * Horário do novo treino: preserva o horário do treino substituído; sem ele,
 * herda o último horário usado no mesmo dia da semana; senão usa 07:00.
 */
export function workoutTimeFor(dateKey: string, plan: Plan, existing?: Block): string {
  if (existing?.time) return existing.time;
  const weekday = weekdayOf(dateKey);
  let latestKey = "";
  let time = "";
  for (const [key, blocks] of Object.entries(plan)) {
    if (key === dateKey || weekdayOf(key) !== weekday) continue;
    const block = blocks.find((item) => item.kind === "treino");
    if (block?.time && key > latestKey) {
      latestKey = key;
      time = block.time;
    }
  }
  return time || DEFAULT_WORKOUT_TIME;
}

/** Troca apenas o bloco substituído e mantém a ordem por horário. */
export function withWorkoutBlock(blocks: Block[], block: Block, replacedId?: string): Block[] {
  return [...blocks.filter((item) => item.id !== replacedId), block].sort((a, b) => a.time.localeCompare(b.time));
}

const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
};

/**
 * Maior intervalo livre do dia, em minutos, considerando os blocos já marcados.
 * Usa o fim do bloco quando existe; sem fim, conta só o horário de início.
 */
export function largestFreeGap(blocks: Block[], dayStart = 6 * 60, dayEnd = 23 * 60): number {
  const spans = blocks
    .map((block) => ({ start: minutesOf(block.time), end: block.endTime ? minutesOf(block.endTime) : minutesOf(block.time) }))
    .filter((span) => span.end >= dayStart && span.start <= dayEnd)
    .sort((a, b) => a.start - b.start);
  let best = 0;
  let cursor = dayStart;
  for (const span of spans) {
    if (span.start > cursor) best = Math.max(best, span.start - cursor);
    cursor = Math.max(cursor, span.end);
  }
  return Math.max(best, dayEnd - cursor);
}
