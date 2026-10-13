import { addDays, format, parseISO } from "date-fns";
import type { Plan, WorkoutHistoryEntry } from "./trilha-data";

export type Habit = { id: string; name: string; createdAt: string };
/** dateKey -> ids of habits marked on that day */
export type HabitLog = Record<string, string[]>;
export type MonthGoal = {
  id: string;
  month: string; // yyyy-MM
  title: string;
  target: number;
  unit: string;
  source: "manual" | "workouts" | "habits";
  manual: number;
};
export type HealthLog = {
  waterGoal: number;
  water: Record<string, number>;
  sleep: Record<string, number>;
  weight: Record<string, number>;
};

export const emptyHealth: HealthLog = { waterGoal: 8, water: {}, sleep: {}, weight: {} };

const key = (d: Date) => format(d, "yyyy-MM-dd");

export function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** Percent (0–100) of today's planned blocks and active habits that are done. */
export function dayScore(plan: Plan, habits: Habit[], log: HabitLog, dateKey: string) {
  const blocks = plan[dateKey] ?? [];
  const marked = new Set(log[dateKey] ?? []);
  const total = blocks.length + habits.length;
  if (total === 0) return 0;
  const done = blocks.filter((b) => b.done).length + habits.filter((h) => marked.has(h.id)).length;
  return Math.round((done / total) * 100);
}

export function isActiveDay(plan: Plan, log: HabitLog, dateKey: string) {
  return (plan[dateKey] ?? []).some((b) => b.done) || (log[dateKey] ?? []).length > 0;
}

/** Consecutive active days ending today (or yesterday, if today has nothing yet). */
export function streak(plan: Plan, log: HabitLog, today: Date) {
  let cursor = isActiveDay(plan, log, key(today)) ? today : addDays(today, -1);
  let count = 0;
  while (isActiveDay(plan, log, key(cursor)) && count < 3650) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export const STREAK_MILESTONES = [7, 14, 30] as const;
export const isMilestone = (n: number) => (STREAK_MILESTONES as readonly number[]).includes(n);

export function goalProgress(goal: MonthGoal, history: WorkoutHistoryEntry[], log: HabitLog) {
  if (goal.source === "workouts") return history.filter((h) => h.completedAt.slice(0, 7) === goal.month).length;
  if (goal.source === "habits") return Object.entries(log).filter(([d, ids]) => d.startsWith(goal.month) && ids.length > 0).length;
  return goal.manual;
}

export const goalPercent = (value: number, target: number) =>
  target <= 0 ? 0 : Math.min(100, Math.round((value / target) * 100));

export function lastDays(today: Date, n: number) {
  return Array.from({ length: n }, (_, i) => key(addDays(today, i - n + 1)));
}

export const shortDay = (k: string) => format(parseISO(k), "dd/MM");
