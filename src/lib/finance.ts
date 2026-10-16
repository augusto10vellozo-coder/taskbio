import { getDaysInMonth } from "date-fns";

export type FinanceEntry = { id: string; date: string; amount: number; description: string; category: string; type: "gasto" | "receita" };
export type Bill = { id: string; title: string; amount: number; dueDate: string; paid?: boolean };
export type FinanceState = { entries: FinanceEntry[]; bills: Bill[]; monthlyBudget: number; customCategories: string[] };

export const FIXED_CATEGORIES = ["Alimentação", "Mercado", "Transporte", "Moradia", "Saúde", "Lazer", "Educação", "Outros"];
export const emptyFinance: FinanceState = { entries: [], bills: [], monthlyBudget: 0, customCategories: [] };

/** Totals for one month (yyyy-MM): spent, income, balance and spending per category (largest first). */
export function monthSummary(entries: FinanceEntry[], month: string) {
  const inMonth = entries.filter((e) => e.date.startsWith(month));
  const spent = inMonth.filter((e) => e.type === "gasto").reduce((n, e) => n + e.amount, 0);
  const income = inMonth.filter((e) => e.type === "receita").reduce((n, e) => n + e.amount, 0);
  const byCat = new Map<string, number>();
  inMonth.filter((e) => e.type === "gasto").forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount));
  const categories = [...byCat.entries()].map(([category, total]) => ({ category, total: round(total) })).sort((a, b) => b.total - a.total);
  return { spent: round(spent), income: round(income), balance: round(income - spent), categories };
}

/** (Monthly budget − spent this month) ÷ days left in the month, including today. Never negative. */
export function dailyAllowance(budget: number, spentThisMonth: number, today: Date) {
  if (budget <= 0) return null;
  const daysLeft = getDaysInMonth(today) - today.getDate() + 1;
  return Math.max(0, round((budget - spentThisMonth) / daysLeft));
}

const round = (n: number) => Math.round(n * 100) / 100;
export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
