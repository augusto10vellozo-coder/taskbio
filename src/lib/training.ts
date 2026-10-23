import { format, parseISO, startOfWeek, subWeeks } from "date-fns";
import type { Exercise, Plan, Workout, WorkoutHistoryEntry } from "./trilha-data";

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
export function exerciseHistory(name: string, log: ExerciseLogEntry[], history: WorkoutHistoryEntry[], workouts: Workout[] = [], plan: Plan = {}, throughDate?: string) {
  const k = exerciseKey(name);
  const fromLog = log.filter((e) => exerciseKey(e.exercise) === k && e.reps > 0).map((e) => ({ date: e.date, loadKg: e.loadKg || 0, reps: e.reps }));
  const fromSessions = history.flatMap((h) => h.exercises.filter((e) => exerciseKey(e.name) === k && e.reps > 0).map((e) => ({ date: h.completedAt.slice(0, 10), loadKg: e.loadKg || 0, reps: e.reps })));
  // Recover legacy partial sessions only where a set was actually marked.
  // A configured/imported exercise alone is not evidence of execution.
  const fromPartial = Object.entries(plan).flatMap(([date, blocks]) => blocks.flatMap((b) => {
    if (b.kind !== "treino" || !b.workoutId) return [];
    const workout = workouts.find((w) => w.id === b.workoutId);
    return (workout?.exercises ?? []).filter((e) => exerciseKey(e.name) === k && e.doneSets > 0 && e.reps > 0).map((e) => ({ date, loadKg: e.loadKg || 0, reps: e.reps }));
  }));
  const seen = new Set<string>();
  return [...fromLog, ...fromSessions, ...fromPartial]
    .filter((e) => !throughDate || e.date <= throughDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((e) => { const key = `${e.date}:${e.loadKg}:${e.reps}`; if (seen.has(key)) return false; seen.add(key); return true; });
}

/** Persist a partial exercise independently of completion of its workout. */
export function recordExerciseSets(log: ExerciseLogEntry[], workout: Workout, exerciseId: string, doneSets: number, date: string) {
  const ex = workout.exercises.find((e) => e.id === exerciseId);
  if (!ex || doneSets <= 0 || ex.reps <= 0) return log;
  const id = `sets:${workout.id}:${exerciseId}:${date}`;
  return [{ id, date, exercise: ex.name, loadKg: ex.loadKg || 0, reps: ex.reps, sets: doneSets, workoutId: workout.id }, ...log.filter((e) => e.id !== id)].slice(0, 2000);
}

export const exercisePerformance = (entry: { loadKg: number; reps: number }) => entry.loadKg > 0 ? `${kg(entry.loadKg)} x ${entry.reps}` : `${entry.reps} reps`;

/** Difference between the latest load and the one before it; positive means progression. */
export function progression(entries: { loadKg: number }[]) {
  const [latest, previous] = entries;
  if (!latest || !previous || latest.loadKg <= 0 || previous.loadKg <= 0) return 0;
  return Math.round((latest.loadKg - previous.loadKg) * 100) / 100;
}

/** Heaviest load per week for the last `weeks` weeks (oldest first); null where nothing was logged. */
export function weeklyMax(entries: { date: string; loadKg: number }[], today: Date, weeks = 8) {
  return Array.from({ length: weeks }, (_, i) => {
    const start = startOfWeek(subWeeks(today, weeks - 1 - i), { weekStartsOn: 1 });
    const key = format(start, "yyyy-MM-dd");
    const loads = entries.filter((e) => e.loadKg > 0 && format(startOfWeek(parseISO(e.date), { weekStartsOn: 1 }), "yyyy-MM-dd") === key).map((e) => e.loadKg);
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
