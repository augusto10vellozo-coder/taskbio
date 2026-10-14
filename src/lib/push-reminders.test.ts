import { describe, expect, it } from "vitest";
import { dueReminders } from "./push-reminders";

// 13:45 UTC = 10:45 in São Paulo
const now = new Date("2026-10-14T13:45:00Z");
const plan = { "2026-10-14": [
  { id: "a", time: "11:00", kind: "compromisso", title: "Consulta" },
  { id: "b", time: "11:15", kind: "treino", title: "Academia" },
  { id: "c", time: "11:00", kind: "refeicao", title: "Lanche" },
  { id: "d", time: "11:00", kind: "compromisso", title: "Feito", done: true },
  { id: "e", time: "11:30", kind: "compromisso", title: "Depois" },
] };

describe("dueReminders", () => {
  it("avisa compromisso 15 minutos antes no fuso do usuário", () => {
    expect(dueReminders(plan, "America/Sao_Paulo", now).map((r) => r.title)).toEqual(["Consulta", "Academia"]);
  });
  it("não avisa refeições, itens concluídos nem compromissos distantes", () => {
    const titles = dueReminders(plan, "America/Sao_Paulo", now).map((r) => r.title);
    expect(titles).not.toContain("Lanche");
    expect(titles).not.toContain("Feito");
    expect(titles).not.toContain("Depois");
  });
});
