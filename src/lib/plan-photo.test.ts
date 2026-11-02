import { describe, expect, it } from "vitest";
import { MAX_PHOTO_BYTES, mergePhotoWorkouts, separatePhotoNotes, photoToValidation, validatePhoto, type PhotoWorkout } from "./plan-photo";

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
  it("apagar repetições bloqueia mesmo quando carga é opcional", () => {
    const w = workout();
    w.exercises = [{ name: "Supino", sets: 5, reps: null, loadKg: null, review: false }];
    expect(photoToValidation([w])).toBeNull();
    w.exercises[0] = { name: "Supino", sets: 5, reps: 15, loadKg: null, review: false };
    expect(photoToValidation([w])?.[0]?.exercises[0]?.loadKg).toBeNull();
  });
  it("aquecimento e instruções sem séries viram notas sem bloquear exercícios", () => {
    const w = workout();
    const notes = ["Aquecimento/mobilidade pré-treino de superiores", "Instrução: mantenha a postura"];
    w.exercises.unshift(...notes.map(name => ({ name, sets: null, reps: null, loadKg: null, review: true })));
    const result = separatePhotoNotes([w]);
    expect(result[0]?.notes).toEqual(notes);
    expect(result[0]?.exercises.map(e => e.name)).toEqual(["Supino"]);
    expect(photoToValidation(result)?.[0]?.exercises).toHaveLength(1);
    expect(w.exercises).toHaveLength(3);
  });
  it("mobilidade com prescrição e exercícios incompletos continuam exercícios", () => {
    const w = workout();
    w.exercises = [
      { name: "Mobilidade", sets: 3, reps: 12, loadKg: null, review: false },
      { name: "Aquecimento 3x12", sets: null, reps: null, loadKg: null, review: true },
      { name: "Supino", sets: null, reps: null, loadKg: null, review: false },
    ];
    const result = separatePhotoNotes([w]);
    expect(result[0]?.notes).toEqual([]);
    expect(result[0]?.exercises).toHaveLength(3);
    expect(photoToValidation(result)).toBeNull();
  });
  it("reúne duas imagens na ordem sem perder continuação de treino", () => {
    const first = workout(), second = workout(); const exercise = second.exercises[0]; if (!exercise) throw new Error("exercício ausente"); exercise.name = "Remada";
    const result = mergePhotoWorkouts([[first], [second]]);
    expect(result).toHaveLength(1);
    expect(result[0]?.exercises.map(e => e.name)).toEqual(["Supino", "Remada"]);
    expect(first.exercises).toHaveLength(1);
  });
  it("exercício por tempo aceita segundos sem repetições", () => {
    const w = workout();
    w.exercises = [{ name: "Prancha", sets: 3, reps: null, durationSec: 30, loadKg: null, review: false }];
    const validated = photoToValidation([w]);
    expect(validated?.[0]?.exercises[0]).toEqual({ name: "Prancha", sets: 3, reps: 0, durationSec: 30, loadKg: null });
  });
  it("tempo ausente e zero continuam bloqueando", () => {
    const w = workout();
    w.exercises = [{ name: "Prancha", sets: 3, reps: null, durationSec: null, loadKg: null, review: false }];
    expect(photoToValidation([w])).toBeNull();
    w.exercises[0] = { name: "Prancha", sets: 3, reps: null, durationSec: 0, loadKg: null, review: false };
    expect(photoToValidation([w])).toBeNull();
  });
});