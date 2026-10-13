import { format, parseISO, startOfWeek, subWeeks } from "date-fns";
import type { Exercise, Workout, WorkoutHistoryEntry } from "./trilha-data";

export type ExerciseLogEntry = {
  id: string;
  date: string; // yyyy-MM-dd
  exercise: string;
  loadKg: number;
  reps: number;
  sets: number;
  workoutId?: string;
};

/** Key used to link the same exercise across workouts, imports and history. */
export const exerciseKey = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Every record of one exercise (manual logs + finished workout sessions), newest first. */
export function exerciseHistory(name: string, log: ExerciseLogEntry[], history: WorkoutHistoryEntry[]) {
  const k = exerciseKey(name);
  const fromLog = log.filter((e) => exerciseKey(e.exercise) === k).map((e) => ({ date: e.date, loadKg: e.loadKg, reps: e.reps }));
  const fromSessions = history.flatMap((h) => h.exercises.filter((e) => exerciseKey(e.name) === k && e.loadKg > 0).map((e) => ({ date: h.completedAt.slice(0, 10), loadKg: e.loadKg, reps: e.reps })));
  return [...fromLog, ...fromSessions].sort((a, b) => b.date.localeCompare(a.date));
}

/** Difference between the latest load and the one before it; positive means progression. */
export function progression(entries: { loadKg: number }[]) {
  if (entries.length < 2) return 0;
  return Math.round((entries[0]!.loadKg - entries[1]!.loadKg) * 100) / 100;
}

/** Heaviest load per week for the last `weeks` weeks (oldest first); null where nothing was logged. */
export function weeklyMax(entries: { date: string; loadKg: number }[], today: Date, weeks = 8) {
  return Array.from({ length: weeks }, (_, i) => {
    const start = startOfWeek(subWeeks(today, weeks - 1 - i), { weekStartsOn: 1 });
    const key = format(start, "yyyy-MM-dd");
    const loads = entries.filter((e) => format(startOfWeek(parseISO(e.date), { weekStartsOn: 1 }), "yyyy-MM-dd") === key).map((e) => e.loadKg);
    return { week: format(start, "dd/MM"), kg: loads.length ? Math.max(...loads) : null };
  });
}

export const kg = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}kg`;

export type ImportedWorkout = {
  day: "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom" | null;
  name: string;
  exercises: { name: string; sets: number; reps: number; loadKg: number | null }[];
};

/** Converts an imported workout into the app's workout shape, reusing names already in the history. */
export function toWorkout(input: ImportedWorkout, knownNames: string[], id: string): Workout {
  const known = new Map(knownNames.map((n) => [exerciseKey(n), n]));
  const exercises: Exercise[] = input.exercises.map((e, i) => ({
    id: `${id}-e${i}`,
    name: known.get(exerciseKey(e.name)) ?? e.name.trim(),
    sets: Math.max(1, Math.round(e.sets) || 3),
    reps: Math.max(1, Math.round(e.reps) || 10),
    restSec: 60,
    muscles: "",
    howTo: "",
    ...(e.loadKg ? { loadKg: e.loadKg } : {}),
    doneSets: 0,
  }));
  return { id, name: input.name.trim() || "Treino importado", focus: "Plano importado", modality: "Academia", exercises };
}
