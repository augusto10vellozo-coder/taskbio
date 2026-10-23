import type { Exercise, Workout, Plan } from './trilha-data';
export type SeriesState = { done: boolean; loadKg?: number | undefined };
export function exerciseSeries(ex: Exercise, date: string): SeriesState[] {
  const saved = ex.seriesByDate?.[date];
  return Array.from({ length: ex.sets }, (_, i) => saved?.[i] ?? { done: !ex.seriesByDate && i < ex.doneSets });
}
export function changeSeries(ex: Exercise, date: string, index: number, patch: Partial<SeriesState>): Exercise {
  const series = exerciseSeries(ex, date);
  if (!series[index]) return ex;
  series[index] = { ...series[index], ...patch };
  return { ...ex, doneSets: series.filter(s => s.done).length, seriesByDate: { ...ex.seriesByDate, [date]: series } };
}
export function sessionProgress(workout: Workout, date: string) {
  const total = workout.exercises.reduce((n, e) => n + e.sets, 0);
  const done = workout.exercises.reduce((n, e) => n + exerciseSeries(e, date).filter(s => s.done).length, 0);
  const exercises = workout.exercises.filter(e => e.sets > 0 && exerciseSeries(e, date).every(s => s.done)).length;
  return { total, done, exercises, complete: total > 0 && done === total };
}
