import { describe, expect, it } from "vitest";
import { personalTodayXp } from "./personal-status";

describe("personal XP without competition", () => {
  it("keeps today's XP and excludes archived history, opening balance and other days", () => {
    const events = [
      { points: 5, day: "2026-10-31", legacy: false, kind: "habit" },
      { points: 15, day: "2026-10-31", legacy: false, kind: "workout" },
      { points: 20, day: "2026-10-31", legacy: false, kind: "bonus_dia_completo" },
      { points: 300, day: "2026-10-31", legacy: false, kind: "saldo_inicial_migracao" },
      { points: 25, day: "2026-10-31", legacy: true, kind: "habit" },
      { points: 5, day: "2026-10-30", legacy: false, kind: "habit" },
    ];
    const original = JSON.stringify(events);
    expect(personalTodayXp(events, "2026-10-31")).toBe(40);
    expect(JSON.stringify(events)).toBe(original);
  });
  it("reflects a personal completion and its reversal without resetting previous XP", () => {
    const base = { points: 5, day: "2026-10-31", legacy: false, kind: "habit" };
    const completed = { ...base, points: 15, kind: "workout" };
    expect(personalTodayXp([base], base.day)).toBe(5);
    expect(personalTodayXp([base, completed], base.day)).toBe(20);
    expect(personalTodayXp([base], base.day)).toBe(5);
  });
});