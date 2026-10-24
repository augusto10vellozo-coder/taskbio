import type { Medication } from "./engagement";

const DAY = 86400000;
export function shiftHealthDay(day: string, offset: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + offset * DAY).toISOString().slice(0, 10);
}
export function previousSevenAverage(values: Record<string, number>, day: string) {
  const recorded = Array.from({ length: 7 }, (_, i) => values[shiftHealthDay(day, -i - 1)]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return recorded.length === 7 ? recorded.reduce((a, b) => a + b, 0) / 7 : null;
}
export function sleepTime(hours: number) {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}
export const validHealthWeight = (value: number) => Number.isFinite(value) && value > 0 && value < 500;
export function medicationPreview(time: string, interval: number) {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return Array.from({ length: Math.ceil(24 / interval) }, (_, i) => {
    const minute = (h * 60 + m + i * interval * 60) % 1440;
    return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  });
}
export type MedicationDose = { id: string; medicationId: string; name: string; time: string; date: string; remainingDays?: number; legacy: boolean };
export function medicationDoses(meds: Medication[], day: string): MedicationDose[] {
  const dayStart = Date.parse(`${day}T00:00:00Z`);
  return meds.flatMap(med => {
    if ((med.startDate && day < med.startDate) || (med.endDate && day > med.endDate)) return [];
    const [h = 0, m = 0] = med.time.split(":").map(Number);
    const start = Date.parse(`${med.startDate ?? day}T00:00:00Z`) + (h * 60 + m) * 60000;
    const interval = (med.intervalHours ?? 24) * 3600000;
    if (!Number.isFinite(start) || interval <= 0) return [];
    const first = start + Math.max(0, Math.ceil((dayStart - start) / interval)) * interval;
    const result: MedicationDose[] = [];
    for (let at = first; at < dayStart + DAY; at += interval) {
      const time = new Date(at).toISOString().slice(11, 16);
      result.push({ id: `${med.id}|${day}|${time}`, medicationId: med.id, name: med.name, date: day, time, legacy: !med.intervalHours,
        ...(med.endDate ? { remainingDays: Math.round((Date.parse(`${med.endDate}T00:00:00Z`) - dayStart) / DAY) } : {}) });
    }
    return result;
  }).sort((a, b) => a.time.localeCompare(b.time));
}
export function doseTaken(dose: MedicationDose, marks: string[]) {
  return marks.includes(dose.id) || (dose.legacy && marks.includes(dose.medicationId));
}
export const commonMedications = ["Bupropiona", "Paracetamol", "Dipirona", "Ibuprofeno", "Losartana", "Metformina", "Omeprazol", "Levotiroxina", "Amoxicilina", "Sertralina"];
export function medicationSuggestion(name: string) {
  const clean = name.trim().toLocaleLowerCase("pt-BR");
  return clean === "bupropioma" ? "Bupropiona" : null;
}