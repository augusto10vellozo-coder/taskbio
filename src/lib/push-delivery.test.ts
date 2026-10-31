import { describe, expect, it } from "vitest";
import { canDeliver, performDelivery, retryAllowed, deliveryResult } from "./push-delivery";
import { defaultNotifPrefs } from "./push-reminders";

describe("delivery acceptance and retries", () => {
  it("records per subscription only after provider acceptance", async () => {
    const events: string[] = [];
    await performDelivery(async () => { events.push("send-device-1"); return { status: 201 }; }, async result => { events.push(result); });
    expect(events).toEqual(["send-device-1", "delivered"]);
  });
  it("retries transient failures at most three times, independently of due windows", async () => {
    const records: string[] = [];
    const first = await performDelivery(async () => ({ status: 503 }), async r => { records.push(r); });
    expect(retryAllowed(1, first.status)).toBe(true);
    const second = await performDelivery(async () => { throw new Error("timeout"); }, async r => { records.push(r); });
    expect(retryAllowed(2, second.status)).toBe(true);
    expect(retryAllowed(3, second.status)).toBe(false);
    expect(records).toEqual(["failed", "failed"]);
  });
  it("invalid 410 subscriptions stop sending instead of retrying expired credentials", () => {
    expect(deliveryResult(410)).toBe("invalid");
    expect(retryAllowed(1, 410)).toBe(false);
  });
  it("one failed device does not change another device acceptance", async () => {
    const statuses: string[] = [];
    await performDelivery(async () => ({ status: 201 }), async r => { statuses.push(`a:${r}`); });
    await performDelivery(async () => ({ status: 410 }), async r => { statuses.push(`b:${r}`); });
    expect(statuses).toEqual(["a:delivered", "b:invalid"]);
  });
});
describe("all layers obey silence and preferences", () => {
  for (const layer of ["streak", "dayClose", "meals", "league", "tasks", "workouts", "weekly", "exams", "bill", "med"]) {
    it(`${layer} is silent from 22:30 through 06:59`, () => {
      for (const utc of ["2026-10-20T01:30:00Z", "2026-10-20T09:59:00Z"]) expect(canDeliver(layer, defaultNotifPrefs, "America/Sao_Paulo", new Date(utc))).toBe(false);
      expect(canDeliver(layer, defaultNotifPrefs, "America/Sao_Paulo", new Date("2026-10-20T10:00:00Z"))).toBe(true);
    });
  }
  it("exams toggle actually disables exams", () => {
    expect(canDeliver("exams", { ...defaultNotifPrefs, exams: false }, "America/Sao_Paulo", new Date("2026-10-20T12:00:00Z"))).toBe(false);
  });
  it("master toggle pauses every layer without touching individual prefs", () => {
    const off = { ...defaultNotifPrefs, master: false };
    for (const layer of ["streak", "dayClose", "meals", "league", "tasks", "workouts", "weekly", "exams", "bill", "med"]) {
      expect(canDeliver(layer, off, "America/Sao_Paulo", new Date("2026-10-20T12:00:00Z"))).toBe(false);
    }
    expect(canDeliver("tasks", { ...off, master: true }, "America/Sao_Paulo", new Date("2026-10-20T12:00:00Z"))).toBe(true);
  });
});