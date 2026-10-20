import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Block, Plan } from "./trilha-data";
import { unifyMealBlocks } from "./meal-link";

export const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");

export const fromDateKey = (key: string) => parseISO(key);

export const getWeekDates = (date: Date) => {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
};

export const getWeekKeys = (date: Date) => getWeekDates(date).map(toDateKey);

export const formatFullDate = (date: Date) =>
  format(date, "EEEE, d 'de' MMMM", { locale: ptBR });

export const formatWeekRange = (date: Date) => {
  const dates = getWeekDates(date);
  const first = dates[0];
  const last = dates[6];
  if (!first || !last) return "";
  const sameMonth = first.getMonth() === last.getMonth();
  return sameMonth
    ? `${format(first, "d", { locale: ptBR })}–${format(last, "d 'de' MMMM", { locale: ptBR })}`
    : `${format(first, "d MMM", { locale: ptBR })} – ${format(last, "d MMM", { locale: ptBR })}`;
};

const legacyKeys = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const;

export function normalizePlan(input: unknown, referenceDate = new Date()): Plan {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const alreadyDated = Object.keys(source).some((key) => /^\d{4}-\d{2}-\d{2}$/.test(key));
  if (alreadyDated) {
    return Object.fromEntries(
      Object.entries(source).filter((entry): entry is [string, Block[]] => Array.isArray(entry[1])).map(([key, blocks]) => [key, unifyMealBlocks(blocks)]),
    );
  }

  const dates = getWeekDates(referenceDate);
  return legacyKeys.reduce<Plan>((next, legacyKey, index) => {
    const blocks = source[legacyKey];
    const date = dates[index];
    if (date && Array.isArray(blocks) && blocks.length > 0) next[toDateKey(date)] = unifyMealBlocks(blocks as Block[]);
    return next;
  }, {});
}