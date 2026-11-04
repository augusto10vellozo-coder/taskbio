import { addDays, parseISO } from "date-fns";
import { toDateKey } from "./calendar-utils";

/** Escada fixa da revisão espaçada. */
export const REVIEW_STAGES = [1, 7, 30] as const;

/** Próximo degrau, ou null quando a escada terminou. */
export function nextReviewStage(stage: number | undefined): 7 | 30 | null {
  if (stage === 1) return 7;
  if (stage === 7) return 30;
  return null;
}

/** O reforço de quem esqueceu cai no dia seguinte. */
export function reinforcementDate(date: string): string {
  return toDateKey(addDays(parseISO(date), 1));
}

/** Id estável do reforço, para não duplicar ao revisar duas vezes. */
export function reinforcementId(sessionId: string | undefined, blockId: string, date: string): string {
  return `rev2:${sessionId ?? blockId}:${date}`;
}
