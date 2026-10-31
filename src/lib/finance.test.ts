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

import { addForecast, averageMonthlySpending, canGoToMonth, contributeGoal, forecastHorizon, forecastSummary, goalProgress, removeForecast } from "./finance";

describe("finanças — planejamento e metas", () => {
  it("permite navegar para meses futuros até dezembro de 2027 a partir de outubro de 2026", () => {
    expect(canGoToMonth("2027-12", "2026-10")).toBe(true);
    expect(canGoToMonth("2029-11", "2026-10")).toBe(false);
  });
  it("previsão repetida por 15 meses cobre de outubro/2026 a dezembro/2027", () => {
    const f = addForecast(emptyFinance, { type: "receita", amount: 3000, description: "Salário", category: "Receita" }, "2026-10", 15, 1);
    expect(f.forecasts).toHaveLength(15);
    expect(f.forecasts!.at(-1)!.month).toBe("2027-12");
    expect(f.entries).toHaveLength(0);
  });
  it("previsto não altera o realizado e saldo previsto = receitas − custos", () => {
    let f = addForecast(emptyFinance, { type: "receita", amount: 3000, description: "Salário", category: "Receita" }, "2027-01", 1, 1);
    f = addForecast(f, { type: "gasto", amount: 1200, description: "Aluguel", category: "Moradia" }, "2027-01", 1, 2);
    const s = forecastSummary(f, "2027-01");
    expect([s.income, s.costs, s.balance, s.actual.spent]).toEqual([3000, 1200, 1800, 0]);
  });
  it("horizonte acumula saldos previstos", () => {
    const f = addForecast(emptyFinance, { type: "receita", amount: 500, description: "", category: "Receita" }, "2027-01", 3, 1);
    expect(forecastHorizon(f, "2027-01", 3).map((m) => m.cumulative)).toEqual([500, 1000, 1500]);
  });
  it("remover 'daqui em diante' apaga só os meses seguintes da série", () => {
    const f = addForecast(emptyFinance, { type: "gasto", amount: 100, description: "", category: "Outros" }, "2027-01", 4, 1);
    const r = removeForecast(f, "p-1-2", true);
    expect(r.forecasts!.map((x) => x.month)).toEqual(["2027-01", "2027-02"]);
  });
  it("meta de 6000 com 1500 guardados e prazo em 9 meses pede 500 por mês", () => {
    const p = goalProgress({ id: "g", name: "Reserva", target: 6000, saved: 1500, deadline: "2027-06" }, "2026-10");
    expect([p.percent, p.remaining, p.perMonth]).toEqual([25, 4500, 500]);
  });
  it("retirada da meta nunca deixa saldo negativo e não cria lançamento", () => {
    const f = contributeGoal({ ...emptyFinance, goals: [{ id: "g", name: "R", target: 100, saved: 30 }] }, "g", -50);
    expect(f.goals![0]!.saved).toBe(0);
    expect(f.entries).toHaveLength(0);
  });
  it("média de gastos ignora meses sem gasto", () => {
    expect(averageMonthlySpending(entries, "2026-11", 3)).toBe(99.5);
  });
});
