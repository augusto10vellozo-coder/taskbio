import { describe, expect, it } from "vitest";
import { dueReminders } from "./push-reminders";

// 13:56 UTC = 10:56 in São Paulo
const now = new Date("2026-10-14T13:56:00Z");
const plan = { "2026-10-14": [
  { id: "a", time: "11:00", kind: "compromisso", title: "Consulta" },
  { id: "b", time: "11:26", kind: "treino", title: "Academia" },
  { id: "c", time: "11:00", kind: "refeicao", title: "Lanche" },
  { id: "d", time: "11:00", kind: "compromisso", title: "Feito", done: true },
  { id: "e", time: "11:30", kind: "compromisso", title: "Depois" },
] };

describe("dueReminders", () => {
  it("avisa compromisso 5 minutos antes no fuso do usuário", () => {
    expect(dueReminders(plan, "America/Sao_Paulo", now).map((r) => r.title)).toEqual(["Consulta", "Academia"]);
  });
  it("não avisa refeições, itens concluídos nem compromissos distantes", () => {
    const titles = dueReminders(plan, "America/Sao_Paulo", now).map((r) => r.title);
    expect(titles).not.toContain("Lanche");
    expect(titles).not.toContain("Feito");
    expect(titles).not.toContain("Depois");
  });
});

import { dueSettingsReminders, dueStreakRisk, dueDayClose, dueMealReminders, dueLeagueOpen, readNotifPrefs, inQuietHours, wallClockMs } from "./push-reminders";
describe("dueSettingsReminders", () => {
  it("avisa conta 1 dia antes às 9h e medicamento no horário", () => {
    const at9 = new Date("2026-10-14T12:02:00Z"); // 09:02 em São Paulo
    const settings = { finance: { bills: [{ id: "x", title: "Luz", amount: 120, dueDate: "2026-10-15" }, { id: "y", title: "Água", amount: 50, dueDate: "2026-10-16" }] }, health: { meds: [{ id: "m", name: "Vitamina", time: "09:00" }] } };
    expect(dueSettingsReminders(settings, "America/Sao_Paulo", at9).map((r) => r.key)).toEqual(["bill|x|2026-10-15", "med|m|2026-10-14"]);
  });
});

const TZ = "America/Sao_Paulo";
const habits = [{ id: "h1" }, { id: "h2" }];
// Segunda 12/10 e terça 13/10 ativas; hoje é quarta 14/10 às 20h em SP
const streakInput = {
  plan: { "2026-10-12": [{ done: true }] },
  habitLog: { "2026-10-13": ["h1"] },
  habits,
  frozenDays: [] as string[],
  freezesAvailable: 0,
};
const at20 = new Date("2026-10-14T23:01:00Z"); // 20:01 em SP

describe("dueStreakRisk", () => {
  it("avisa às 20h com streak >= 2 e hábitos pendentes", () => {
    const [r] = dueStreakRisk(streakInput, TZ, at20);
    expect(r.title).toBe("🔥 Seu streak de 2 dias está em risco — faltam 2 hábitos hoje");
    expect(r.key).toBe("streak|2026-10-14");
  });
  it("menciona o congelamento quando há um disponível", () => {
    const [r] = dueStreakRisk({ ...streakInput, freezesAvailable: 1 }, TZ, at20);
    expect(r.title).toBe("🔥 Streak em risco — use seu congelamento ou marque seus hábitos agora");
  });
  it("não avisa com dia 100% marcado, streak curto ou fora do horário", () => {
    expect(dueStreakRisk({ ...streakInput, habitLog: { "2026-10-13": ["h1"], "2026-10-14": ["h1", "h2"] } }, TZ, at20)).toEqual([]);
    expect(dueStreakRisk({ ...streakInput, plan: {} }, TZ, at20)).toEqual([]);
    expect(dueStreakRisk(streakInput, TZ, new Date("2026-10-14T22:00:00Z"))).toEqual([]); // 19h em SP
  });
});

describe("dueDayClose", () => {
  const at2130 = new Date("2026-10-15T00:31:00Z"); // 21:31 em SP
  const dayPlan = { "2026-10-14": [{ done: true }, { done: false }, { done: false }] };
  it("avisa às 21h30 com itens pendentes e XP restante até o teto de 100", () => {
    const [r] = dueDayClose(dayPlan, 60, TZ, at2130);
    expect(r.title).toBe("Faltam 2 itens pra fechar o dia — vale 40 XP");
  });
  it("não avisa sem pendências e zera o XP no teto", () => {
    expect(dueDayClose({ "2026-10-14": [{ done: true }] }, 60, TZ, at2130)).toEqual([]);
    expect(dueDayClose(dayPlan, 120, TZ, at2130)[0]!.title).toContain("vale 0 XP");
  });
});

describe("dueMealReminders", () => {
  const mealPlan = { "2026-10-14": [
    { id: "m1", kind: "refeicao", time: "12:00", title: "Almoço" },
    { id: "m2", kind: "refeicao", time: "12:00", title: "Feito", done: true },
    { id: "m3", kind: "compromisso", time: "12:00", title: "Reunião" },
  ] };
  it("avisa 45 min após refeição planejada sem registro", () => {
    const at1246 = new Date("2026-10-14T15:46:00Z"); // 12:46 em SP
    const due = dueMealReminders(mealPlan, TZ, at1246);
    expect(due.map((r) => r.key)).toEqual(["mealrem|m1|2026-10-14"]);
    expect(due[0]!.title).toBe("Já registrou: Almoço?");
  });
  it("não avisa antes dos 45 min nem muito depois", () => {
    expect(dueMealReminders(mealPlan, TZ, new Date("2026-10-14T15:40:00Z"))).toEqual([]);
    expect(dueMealReminders(mealPlan, TZ, new Date("2026-10-14T16:30:00Z"))).toEqual([]);
  });
});

describe("dueLeagueOpen", () => {
  it("avisa segunda às 9h com a posição da semana anterior", () => {
    const mon = new Date("2026-10-19T12:01:00Z"); // segunda 09:01 em SP
    const [r] = dueLeagueOpen(3, TZ, mon);
    expect(r.title).toBe("🏆 Nova semana da liga começou!");
    expect(r.body).toContain("3º lugar");
  });
  it("não avisa em outro dia nem sem posição conhecida", () => {
    expect(dueLeagueOpen(3, TZ, new Date("2026-10-20T12:01:00Z"))).toEqual([]); // terça
    expect(dueLeagueOpen(null, TZ, new Date("2026-10-19T12:01:00Z"))[0]!.body).not.toContain("lugar");
  });
});

describe("preferências e horário de silêncio", () => {
  it("lê toggles salvos e liga tudo por padrão", () => {
    expect(readNotifPrefs(null)).toEqual({ streak: true, dayClose: true, meals: true, league: true, tasks: true, workouts: true });
    expect(readNotifPrefs({ notifPrefs: { streak: false } }).streak).toBe(false);
    expect(readNotifPrefs({ notifPrefs: { streak: false } }).meals).toBe(true);
  });
  it("silencia entre 22h30 e 7h no fuso do usuário", () => {
    expect(inQuietHours(wallClockMs(new Date("2026-10-15T01:40:00Z"), TZ))).toBe(true); // 22:40 SP
    expect(inQuietHours(wallClockMs(new Date("2026-10-15T09:00:00Z"), TZ))).toBe(true); // 06:00 SP
    expect(inQuietHours(wallClockMs(new Date("2026-10-14T23:01:00Z"), TZ))).toBe(false); // 20:01 SP
  });
  it("toggles de tarefas e treinos filtram os lembretes da agenda", () => {
    const all = dueReminders(plan, TZ, now);
    expect(all.map((r) => r.title)).toEqual(["Consulta", "Academia"]);
    expect(dueReminders(plan, TZ, now, { ...readNotifPrefs(null), workouts: false }).map((r) => r.title)).toEqual(["Consulta"]);
    expect(dueReminders(plan, TZ, now, { ...readNotifPrefs(null), tasks: false }).map((r) => r.title)).toEqual(["Academia"]);
  });
});
