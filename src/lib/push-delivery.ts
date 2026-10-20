import { inQuietHours, wallClockMs, type NotifPrefs } from "./push-reminders";

export function deliveryResult(status?: number) {
  if (status !== undefined && status >= 200 && status < 300) return "delivered" as const;
  if (status === 404 || status === 410) return "invalid" as const;
  return "failed" as const;
}
export function transientFailure(status?: number) {
  return status === undefined || status === 408 || status === 429 || status >= 500;
}
export function canDeliver(layer: string, prefs: NotifPrefs, timeZone: string, now: Date) {
  if (inQuietHours(wallClockMs(now, timeZone))) return false;
  return !(layer in prefs) || prefs[layer as keyof NotifPrefs];
}
export function reminderLayer(key: string, workout = false): string {
  const prefix = key.split("|")[0];
  if (prefix === "exam0" || prefix === "exam1") return "exams";
  if (prefix === "milestone" || prefix === "streak") return "streak";
  if (prefix === "dayfull" || prefix === "dayclose") return "dayClose";
  if (prefix === "mealrem") return "meals";
  if (prefix === "leaguemove" || prefix === "league") return "league";
  if (prefix === "weekly" || prefix === "bill" || prefix === "med") return prefix;
  return workout ? "workouts" : "tasks";
}