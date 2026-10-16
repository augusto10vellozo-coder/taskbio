import { describe, expect, it } from "vitest";
import { dailyAllowance, monthSummary, type FinanceEntry } from "./finance";

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
    expect(s.categories).toEqual([{ category: "Mercado", total: 70 }, { category: "Transporte", total: 30 }]);
  });
  it("divide o orçamento restante pelos dias que faltam no mês", () => {
    // 31/10 → 1 dia restante; 22/10 → 10 dias restantes
    expect(dailyAllowance(1100, 100, new Date(2026, 9, 22))).toBe(100);
    expect(dailyAllowance(1100, 100, new Date(2026, 9, 31))).toBe(1000);
    expect(dailyAllowance(0, 0, new Date(2026, 9, 22))).toBeNull();
  });
});
