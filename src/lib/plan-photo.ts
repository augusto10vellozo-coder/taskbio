import { z } from "zod";
import type { ImportedWorkout } from "./training";

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const PHOTO_UNREADABLE = "Não consegui identificar um plano de treino nesta imagem. Tente uma foto mais nítida ou outro ângulo.";
export const photoPlanSchema = z.object({
  readable: z.boolean(),
  workouts: z.array(z.object({
    day: z.enum(["seg", "ter", "qua", "qui", "sex", "sab", "dom"]).nullable(),
    name: z.string(),
    exercises: z.array(z.object({
      name: z.string(), sets: z.number().nullable(), reps: z.number().nullable(), loadKg: z.number().nullable(),
      review: z.boolean(),
    }).strict()),
  }).strict()),
}).strict();
export type PhotoWorkout = z.infer<typeof photoPlanSchema>["workouts"][number];

export function validatePhoto(file: { name: string; size: number }) {
  if (file.size > MAX_PHOTO_BYTES) return "A imagem passa de 10 MB. Envie uma imagem menor.";
  if (!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) return "Formato não aceito. Use JPG, PNG, WEBP ou HEIC.";
  return null;
}

/** Only explicitly reviewed, complete values may enter the legacy validator. */
export function photoToValidation(workouts: PhotoWorkout[]): ImportedWorkout[] | null {
  if (!workouts.length || workouts.some(w => !w.name.trim() || !w.exercises.length || w.exercises.some(e =>
    !e.name.trim() || e.review || e.sets === null || !Number.isInteger(e.sets) || e.sets < 1 || e.reps === null || !Number.isInteger(e.reps) || e.reps < 1 || (e.loadKg !== null && (!Number.isFinite(e.loadKg) || e.loadKg < 0))))) return null;
  return workouts.map(w => ({ ...w, exercises: w.exercises.map(e => ({ name: e.name, sets: Number(e.sets), reps: Number(e.reps), loadKg: e.loadKg })) }));
}

/** Merge page continuations, preserving the first appearance and exercise order. */
export function mergePhotoWorkouts(pages: PhotoWorkout[][]): PhotoWorkout[] {
  const result: PhotoWorkout[] = [];
  for (const workout of pages.flat()) {
    const existing = result.find(w => w.day === workout.day && w.name.trim().toLocaleLowerCase() === workout.name.trim().toLocaleLowerCase());
    if (existing) existing.exercises.push(...workout.exercises.map(e => ({ ...e })));
    else result.push({ ...workout, exercises: workout.exercises.map(e => ({ ...e })) });
  }
  return result;
}