import { addDays, format, parseISO } from "date-fns";
import type { Plan, WorkoutHistoryEntry } from "./trilha-data";

/** countsForStreak defaults to true when missing. */
export type Habit = { id: string; name: string; createdAt: string; countsForStreak?: boolean; frequency?: "daily" | "weekly"; weeklyTarget?: number; emoji?: string; frequencySince?: string };
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
  meds?: { id: string; name: string; time: string }[];
  medsTaken?: Record<string, string[]>;
};
export type SessionEntry = { id: string; date: string; minutes: number; title: string; bookId?: string; pages?: number; progressMode?: "pages" | "percent"; progressPercent?: number; agendaBlockId?: string; subjectId?: string; learned?: string };
export type Subject = { id: string; name: string; color: string; weeklyGoalMin?: number };
export type Exam = { id: string; subjectId: string; subjectName?: string; title: string; date: string; done?: boolean };
export type BookStatus = "lendo" | "concluido" | "quero";
export type Quote = { id: string; text: string; page?: number };
export type Book = { id: string; title: string; author: string; totalPages?: number | undefined; pagesRead: number; progressMode?: "pages" | "percent"; progressPercent?: number; cover?: string | undefined; status: BookStatus; rating?: number; quotes: Quote[]; createdAt: string };
export type Trackers = { leitura: SessionEntry[]; estudos: SessionEntry[]; books?: Book[]; readingGoal?: number; subjects?: Subject[]; exams?: Exam[]; pomodoro?: { focus: number; pause: number } };
export const emptyTrackers: Trackers = { leitura: [], estudos: [], books: [], readingGoal: 180 };

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

export function isActiveDay(plan: Plan, log: HabitLog, dateKey: string, habits?: Habit[]) {
  const excluded = new Set((habits ?? []).filter((h) => h.countsForStreak === false).map((h) => h.id));
  return (plan[dateKey] ?? []).some((b) => b.done) || (log[dateKey] ?? []).some((id) => !excluded.has(id));
}

/** Consecutive active days ending today (or yesterday, if today has nothing yet). */
export function streak(plan: Plan, log: HabitLog, today: Date, habits?: Habit[], frozen?: Set<string>) {
  const on = (d: Date) => isActiveDay(plan, log, key(d), habits) || !!frozen?.has(key(d));
  let cursor = on(today) ? today : addDays(today, -1);
  let count = 0;
  while (on(cursor) && count < 3650) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export const STREAK_MILESTONES = [7, 14, 30] as const;
export const isMilestone = (n: number) => (STREAK_MILESTONES as readonly number[]).includes(n);

export function goalProgress(goal: MonthGoal, history: WorkoutHistoryEntry[], log: HabitLog, plan: Plan = {}) {
  if (goal.source === "workouts") {
    // Completed workout blocks in the week plan, plus finished sessions on days without such a block.
    const doneDays = Object.entries(plan).filter(([d, blocks]) => d.startsWith(goal.month) && blocks.some((b) => b.kind === "treino" && b.done));
    const daysWithBlock = new Set(doneDays.map(([d]) => d));
    const blocks = doneDays.reduce((n, [, b]) => n + b.filter((x) => x.kind === "treino" && x.done).length, 0);
    const sessions = history.filter((h) => h.completedAt.slice(0, 7) === goal.month && !daysWithBlock.has(h.completedAt.slice(0, 10))).length;
    return blocks + sessions;
  }
  if (goal.source === "habits") return Object.entries(log).filter(([d, ids]) => d.startsWith(goal.month) && ids.length > 0).length;
  return goal.manual;
}

export const goalPercent = (value: number, target: number) =>
  target <= 0 ? 0 : Math.min(100, Math.round((value / target) * 100));

export function lastDays(today: Date, n: number) {
  return Array.from({ length: n }, (_, i) => key(addDays(today, i - n + 1)));
}

export const shortDay = (k: string) => format(parseISO(k), "dd/MM");
