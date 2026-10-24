import { describe, expect, it } from "vitest";
import { billReminderDate, billRemindersOn, billStatus, budgetFor, dailyAllowance, emptyFinance, monthSummary, payBill, removeBill, unpayBill, validAmount, type FinanceEntry, type FinanceState } from "./finance";

const entries: FinanceEntry[] = [
  { id: "1", date: "2026-10-02", amount: 50, description: "Feira", category: "Mercado", type: "gasto" },
  { id: "2", date: "2026-10-05", amount: 30, description: "Ônibus", category: "Transporte", type: "gasto" },
  { id: "3", date: "2026-10-06", amount: 20, description: "Pão", category: "Mercado", type: "gasto" },
  { id: "4", date: "2026-10-01", amount: 1000, description: "Salário", category: "Outros", type: "receita" },
  { id: "5", date: "2026-09-30", amount: 99, description: "Mês anterior", category: "Lazer", type: "gasto" },
];

describe("finanças", () => {
  it("soma gastos do mês por categoria e calcula saldo", () => {
    const s = monthSummary(entries, "2026-10");
    expect(s.spent).toBe(100);
    expect(s.balance).toBe(900);
    expect(s.categories.map((c) => [c.category, c.total, c.percent])).toEqual([["Mercado", 70, 70], ["Transporte", 30, 30]]);
    expect(monthSummary(entries, "2026-09").spent).toBe(99);
  });
  it("receita 3000 e gasto 1200 dão saldo 1800", () => {
    const s = monthSummary([{ id: "a", date: "2026-10-01", amount: 3000, description: "", category: "Receita", type: "receita" }, { id: "b", date: "2026-10-02", amount: 1200, description: "", category: "Outros", type: "gasto" }], "2026-10");
    expect(s.balance).toBe(1800);
  });
  it("orçamento 2000 com 1200 gastos e 10 dias restantes = 80 por dia", () => {
    expect(dailyAllowance(2000, 1200, new Date(2026, 9, 22))).toBe(80);
    expect(dailyAllowance(0, 0, new Date(2026, 9, 22))).toBeNull();
  });
  it("orçamento vale por mês", () => {
    const f: FinanceState = { ...emptyFinance, budgets: { "2026-10": 2000 } };
    expect(budgetFor(f, "2026-10", "2026-10")).toBe(2000);
    expect(budgetFor(f, "2026-09", "2026-10")).toBe(0);
  });
  it("não aceita zero, negativo nem acima de 1 milhão", () => {
    expect(validAmount(0)).toBe(false);
    expect(validAmount(-5)).toBe(false);
    expect(validAmount(1_000_000.01)).toBe(false);
    expect(validAmount(1_000_000)).toBe(true);
  });
  it("pagar conta lança um gasto; desmarcar remove", () => {
    const f: FinanceState = { ...emptyFinance, bills: [{ id: "luz", title: "Luz", amount: 250, dueDate: "2026-10-30", category: "Contas fixas" }] };
    const paid = payBill(payBill(f, "luz", "2026-10-24"), "luz", "2026-10-24");
    expect(paid.entries).toHaveLength(1);
    expect(paid.entries[0]).toMatchObject({ amount: 250, description: "Luz", date: "2026-10-24", type: "gasto" });
    expect(monthSummary(paid.entries, "2026-10").spent).toBe(250);
    expect(unpayBill(paid, "luz").entries).toHaveLength(0);
    expect(removeBill(paid, "luz", true).entries).toHaveLength(0);
    expect(removeBill(paid, "luz", false).entries).toHaveLength(1);
  });
  it("lembrete na Agenda um dia antes, só para conta não paga", () => {
    expect(billReminderDate("2026-10-30")).toBe("2026-10-29");
    expect(billReminderDate("2026-11-01")).toBe("2026-10-31");
    const bills = [{ id: "a", title: "Luz", amount: 250, dueDate: "2026-10-30" }, { id: "b", title: "Água", amount: 50, dueDate: "2026-10-30", paid: true }];
    expect(billRemindersOn(bills, "2026-10-29").map((b) => b.id)).toEqual(["a"]);
  });
  it("estado da conta: a vencer, hoje, atrasada", () => {
    const b = { id: "a", title: "Luz", amount: 1, dueDate: "2026-10-30" };
    expect(billStatus(b, "2026-10-24").label).toBe("Vence em 6 dias");
    expect(billStatus(b, "2026-10-30").kind).toBe("hoje");
    expect(billStatus(b, "2026-11-02").label).toBe("Atrasada há 3 dias");
  });
});
