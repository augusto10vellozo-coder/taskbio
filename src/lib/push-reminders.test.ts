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

import { dueSettingsReminders } from "./push-reminders";
describe("dueSettingsReminders", () => {
  it("avisa conta 1 dia antes às 9h e medicamento no horário", () => {
    const at9 = new Date("2026-10-14T12:02:00Z"); // 09:02 em São Paulo
    const settings = { finance: { bills: [{ id: "x", title: "Luz", amount: 120, dueDate: "2026-10-15" }, { id: "y", title: "Água", amount: 50, dueDate: "2026-10-16" }] }, health: { meds: [{ id: "m", name: "Vitamina", time: "09:00" }] } };
    expect(dueSettingsReminders(settings, "America/Sao_Paulo", at9).map((r) => r.key)).toEqual(["bill|x|2026-10-15", "med|m|2026-10-14"]);
  });
});
