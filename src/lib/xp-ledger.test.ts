import { describe, expect, it } from "vitest";
import { dayCompletion, dayXp, grantXP, rankByCompletion, revokeXP, routineStreak, syncDayBonus, weeklyCompletionAverage, leagueLabel, type LedgerEvent } from "./xp-ledger";
import { XP_POINTS } from "./xp";

const U = "u1", D = "2026-10-28";
const ev = (taskType: string, taskId: string, points: number, date = D): LedgerEvent => ({ userId: U, taskType, taskId, date, points });

describe("central XP ledger", () => {
  it("same meal from Alimentação then Agenda grants 5 once", () => {
    const e: LedgerEvent[] = [];
    expect(grantXP(e, ev("meal", "m1", XP_POINTS.meal))).toBe(5);
    expect(grantXP(e, ev("meal", "m1", XP_POINTS.meal))).toBe(0);
    expect(e).toHaveLength(1);
  });
  it("revoke removes 5 and regrant never exceeds 5", () => {
    const e: LedgerEvent[] = [];
    grantXP(e, ev("meal", "m1", 5));
    expect(revokeXP(e, U, "meal", "m1", D)).toBe(5);
    expect(dayXp(e, U, D)).toBe(0);
    grantXP(e, ev("meal", "m1", 5)); grantXP(e, ev("meal", "m1", 5));
    expect(dayXp(e, U, D)).toBe(5);
  });
  it("3 habits + workout = 30", () => {
    const e: LedgerEvent[] = [];
    ["h1", "h2", "h3"].forEach((h) => grantXP(e, ev("habit", h, XP_POINTS.habit)));
    grantXP(e, ev("workout", "w1", XP_POINTS.workout));
    expect(dayXp(e, U, D)).toBe(30);
  });
  it("stops at the 150 daily cap", () => {
    const e: LedgerEvent[] = [];
    for (let i = 0; i < 10; i++) grantXP(e, ev("workout", `w${i}`, 15));
    expect(dayXp(e, U, D)).toBe(150);
    expect(grantXP(e, ev("habit", "late", 5))).toBe(0);
    expect(e).toHaveLength(10);
  });
  it("full-day bonus once, may pass the cap, revoked when the day drops below 100%", () => {
    const e: LedgerEvent[] = [];
    for (let i = 0; i < 10; i++) grantXP(e, ev("workout", `w${i}`, 15));
    expect(syncDayBonus(e, U, D, 4, 4)).toBe(20);
    expect(syncDayBonus(e, U, D, 4, 4)).toBe(0);
    expect(dayXp(e, U, D)).toBe(170);
    expect(syncDayBonus(e, U, D, 3, 4)).toBe(-20);
    expect(dayXp(e, U, D)).toBe(150);
  });
  it("opening balance is not capped nor revocable", () => {
    const e: LedgerEvent[] = [];
    expect(grantXP(e, ev("saldo_inicial_migracao", U, 900))).toBe(900);
    expect(grantXP(e, ev("habit", "h1", 5))).toBe(5);
    expect(() => revokeXP(e, U, "saldo_inicial_migracao", U, D)).toThrow();
  });
});

describe("completion league and routine streak", () => {
  it("medication and inactive modules are ignored; nothing planned = absent", () => {
    expect(dayCompletion([{ module: "habito", done: true }, { module: "medicamento", done: false }], ["habito"])).toBe(1);
    expect(dayCompletion([{ module: "leitura", done: true }], ["habito"])).toBeNull();
  });
  it("3 modules at 100% ties 6 modules at 100%; no-plan user hidden", () => {
    const ranked = rankByCompletion([
      { user_id: "A", pct: 1, streak_rotina: 2, day_xp: 10 },
      { user_id: "B", pct: 1, streak_rotina: 2, day_xp: 10 },
      { user_id: "C", pct: null, streak_rotina: 9, day_xp: 0 },
    ]);
    expect(ranked.map((r) => r.user_id)).toEqual(["A", "B"]);
    expect(ranked[0]!.pct).toBe(ranked[1]!.pct);
  });
  it("tiebreak by routine streak then day XP; weekly average and label", () => {
    const r = rankByCompletion([{ user_id: "a", pct: 0.5, streak_rotina: 1, day_xp: 50 }, { user_id: "b", pct: 0.5, streak_rotina: 3, day_xp: 0 }]);
    expect(r[0]!.user_id).toBe("b");
    expect(weeklyCompletionAverage([1, 0.5, null])).toBe(0.75);
    expect(leagueLabel("Cezar", 0.87)).toBe("Cezar · 87%");
  });
  it("routine streak rises with a completion and resets after an empty day", () => {
    expect(routineStreak(new Set(["2026-10-27", "2026-10-28"]), "2026-10-28")).toBe(2);
    expect(routineStreak(new Set(["2026-10-26"]), "2026-10-28")).toBe(0);
  });
});
