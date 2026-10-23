import { describe, expect, it } from "vitest";
import { MAX_PHOTO_BYTES, mergePhotoWorkouts, photoToValidation, validatePhoto, type PhotoWorkout } from "./plan-photo";

const workout = (): PhotoWorkout => ({ day: "seg", name: "Treino A", exercises: [{ name: "Supino", sets: 5, reps: 15, loadKg: 20, review: false }] });
describe("importação de fotos", () => {
  it("aceita JPG PNG WEBP HEIC até 10 MB por imagem", () => {
    expect(MAX_PHOTO_BYTES).toBe(10485760);
    for (const extension of ["jpg", "png", "webp", "heic"]) expect(validatePhoto({ name: `foto.${extension}`, size: 10485760 })).toBeNull();
    expect(validatePhoto({ name: "foto.jpg", size: 10485761 })).not.toBeNull();
  });
  it("preserva séries/repetições ausentes sem inventar valores", () => {
    const w = workout(); const exercise = w.exercises[0]; if (!exercise) throw new Error("exercício ausente"); exercise.sets = null; exercise.reps = null;
    expect(photoToValidation([w])).toBeNull();
    expect(w.exercises[0]).toMatchObject({ sets: null, reps: null });
  });
  it("carga ausente permanece nula e não impede a validação", () => {
    const w = workout(); const exercise = w.exercises[0]; if (!exercise) throw new Error("exercício ausente"); exercise.loadKg = null;
    expect(photoToValidation([w])?.[0]?.exercises[0]).toEqual({ name: "Supino", sets: 5, reps: 15, loadKg: null });
  });
  it("campos duvidosos exigem confirmação humana", () => {
    const w = workout(); const exercise = w.exercises[0]; if (!exercise) throw new Error("exercício ausente"); exercise.review = true;
    expect(photoToValidation([w])).toBeNull();
  });
  it("reúne duas imagens na ordem sem perder continuação de treino", () => {
    const first = workout(), second = workout(); const exercise = second.exercises[0]; if (!exercise) throw new Error("exercício ausente"); exercise.name = "Remada";
    const result = mergePhotoWorkouts([[first], [second]]);
    expect(result).toHaveLength(1);
    expect(result[0]?.exercises.map(e => e.name)).toEqual(["Supino", "Remada"]);
    expect(first.exercises).toHaveLength(1);
  });
});