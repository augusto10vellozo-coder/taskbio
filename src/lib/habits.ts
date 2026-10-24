import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";
import type { Habit, HabitLog } from "./engagement";

const key = (date: Date) => format(date, "yyyy-MM-dd");
export const habitWeek = (date: string) => key(startOfWeek(parseISO(date), { weekStartsOn: 1 }));
export const weeklyTarget = (habit: Habit) => Math.max(1, Math.min(6, Math.round(habit.weeklyTarget ?? 3)));
export const normalizeHabits = (habits: Habit[]) => habits.map(h => ({ ...h, frequency: h.frequency === "weekly" ? "weekly" as const : "daily" as const }));
export function weekMarks(habit: Habit, log: HabitLog, date: string) {
  const start = parseISO(habitWeek(date));
  return Array.from({ length: 7 }, (_, i) => key(addDays(start, i))).filter(d => log[d]?.includes(habit.id)).length;
}
export function canMarkHabit(habit: Habit, log: HabitLog, date: string) {
  return !!log[date]?.includes(habit.id) || habit.frequency !== "weekly" || weekMarks(habit, log, date) < weeklyTarget(habit);
}
export function changeHabitMark(habit: Habit, log: HabitLog, date: string): HabitLog {
  if (!canMarkHabit(habit, log, date)) return log;
  const current = log[date] ?? [];
  return { ...log, [date]: current.includes(habit.id) ? current.filter(id => id !== habit.id) : [...current, habit.id] };
}
export function editHabit(previous: Habit, patch: Pick<Habit, "name" | "frequency" | "weeklyTarget" | "emoji">, today: string) {
  const changed = (previous.frequency ?? "daily") !== (patch.frequency ?? "daily") || (patch.frequency === "weekly" && weeklyTarget(previous) !== weeklyTarget({ ...previous, ...patch }));
  return { ...previous, ...patch, ...(changed ? { frequencySince: habitWeek(today) } : {}) };
}
export function habitStreak(habit: Habit, log: HabitLog, today: string): number {
  const since = habit.frequencySince ?? "0000-00-00";
  if (habit.frequency === "weekly") {
    let cursor = parseISO(habitWeek(today));
    if (weekMarks(habit, log, key(cursor)) < weeklyTarget(habit)) cursor = addDays(cursor, -7);
    let n = 0;
    while (key(cursor) >= since && weekMarks(habit, log, key(cursor)) >= weeklyTarget(habit) && n < 520) { n++; cursor = addDays(cursor, -7); }
    return n;
  }
  let cursor = parseISO(today);
  if (!log[today]?.includes(habit.id)) cursor = addDays(cursor, -1);
  let n = 0;
  while (key(cursor) >= since && log[key(cursor)]?.includes(habit.id) && n < 36500) { n++; cursor = addDays(cursor, -1); }
  return n;
}
export function habitMilestone(habit: Habit, count: number) {
  return (habit.frequency === "weekly" ? [4, 12, 52] : [7, 30, 100]).includes(count);
}
export function habitConsistency(habits: Habit[], log: HabitLog, today: string) {
  let marked = 0, expected = 0;
  let recent = false;
  const end = parseISO(today);
  for (const habit of habits) {
    const created = habit.createdAt.slice(0, 10);
    const age = /^\d{4}-\d{2}-\d{2}$/.test(created) ? Math.max(0, differenceInCalendarDays(end, parseISO(created)) + 1) : 35;
    const days = Math.min(35, age);
    recent ||= days < 35;
    if (!days) continue;
    expected += habit.frequency === "weekly" ? weeklyTarget(habit) * days / 7 : days;
    for (let i = 0; i < days; i++) if (log[key(addDays(end, -i))]?.includes(habit.id)) marked++;
  }
  return { percent: expected ? Math.min(100, Math.round(marked / expected * 100)) : 0, recent };
}