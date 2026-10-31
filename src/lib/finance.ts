import { addDays, addMonths, differenceInCalendarDays, format, getDaysInMonth, parseISO } from "date-fns";

export type FinanceEntry = { id: string; date: string; amount: number; description: string; category: string; type: "gasto" | "receita"; billId?: string | undefined; source?: "compras" | "importado" };
export type Bill = { id: string; title: string; amount: number; dueDate: string; category?: string; paid?: boolean; paidDate?: string | undefined };
export type ShoppingRecord = { signature: string; amount: number; date: string };
export type SavedImportMapping = { id: string; name: string; hasHeader: boolean; date: number; amount: number; description: number; type?: number | undefined; category?: number | undefined };
export type FinanceState = { entries: FinanceEntry[]; bills: Bill[]; monthlyBudget: number; budgets?: Record<string, number>; customCategories: string[]; shoppingRecord?: ShoppingRecord; importMappings?: SavedImportMapping[]; forecasts?: Forecast[]; goals?: FinanceGoal[] };
/** Planned (estimated) income or cost for a month; never counts as a real entry. */
export type Forecast = { id: string; month: string; type: "gasto" | "receita"; amount: number; description: string; category: string; series?: string | undefined };
/** Savings goal (e.g. emergency fund); contributions only move `saved`, never create entries. */
export type FinanceGoal = { id: string; name: string; target: number; saved: number; deadline?: string | undefined };

export const FIXED_CATEGORIES = ["Alimentação", "Mercado", "Compras", "Contas fixas", "Transporte", "Moradia", "Saúde", "Lazer", "Educação", "Outros"];
export const emptyFinance: FinanceState = { entries: [], bills: [], monthlyBudget: 0, budgets: {}, customCategories: [] };
export const MAX_AMOUNT = 1_000_000;

/** Valid amount: greater than zero and at most R$ 1.000.000,00. */
export const validAmount = (v: number) => Number.isFinite(v) && v > 0 && v <= MAX_AMOUNT;

/** Totals for one month (yyyy-MM): spent, income, balance and spending per category (largest first). */
export function monthSummary(entries: FinanceEntry[], month: string) {
  const inMonth = entries.filter((e) => e.date.startsWith(month));
  const spent = inMonth.filter((e) => e.type === "gasto").reduce((n, e) => n + e.amount, 0);
  const income = inMonth.filter((e) => e.type === "receita").reduce((n, e) => n + e.amount, 0);
  const byCat = new Map<string, number>();
  inMonth.filter((e) => e.type === "gasto").forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount));
  const categories = [...byCat.entries()]
    .map(([category, total]) => ({ category, total: round(total), percent: spent ? Math.round((total / spent) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
  return { spent: round(spent), income: round(income), balance: round(income - spent), categories };
}

/** (Monthly budget − spent this month) ÷ days left in the month, including today. Never negative. */
export function dailyAllowance(budget: number, spentThisMonth: number, today: Date) {
  if (budget <= 0) return null;
  const daysLeft = getDaysInMonth(today) - today.getDate() + 1;
  return Math.max(0, round((budget - spentThisMonth) / daysLeft));
}

/** Budget is per month; the legacy single budget only applies to the current month when that month has none. */
export function budgetFor(f: FinanceState, month: string, currentMonth: string) {
  const own = f.budgets?.[month];
  if (own !== undefined) return own;
  return month === currentMonth ? f.monthlyBudget || 0 : 0;
}

export const setBudget = (f: FinanceState, month: string, value: number): FinanceState => ({ ...f, budgets: { ...(f.budgets ?? {}), [month]: Math.max(0, value) } });

/** Paying a bill creates exactly one linked expense on the payment date; the bill stays the single source. */
export function payBill(f: FinanceState, billId: string, paidDate: string): FinanceState {
  const bill = f.bills.find((b) => b.id === billId);
  if (!bill || bill.paid) return f;
  const entry: FinanceEntry = { id: `bill-${bill.id}`, date: paidDate, amount: bill.amount, description: bill.title, category: bill.category || "Contas fixas", type: "gasto", billId: bill.id };
  return { ...f, bills: f.bills.map((b) => (b.id === billId ? { ...b, paid: true, paidDate } : b)), entries: [entry, ...f.entries.filter((e) => e.billId !== billId)] };
}

export function unpayBill(f: FinanceState, billId: string): FinanceState {
  return { ...f, bills: f.bills.map((b) => (b.id === billId ? { ...b, paid: false, paidDate: undefined } : b)), entries: f.entries.filter((e) => e.billId !== billId) };
}

export function removeBill(f: FinanceState, billId: string, removeExpense: boolean): FinanceState {
  return { ...f, bills: f.bills.filter((b) => b.id !== billId), entries: removeExpense ? f.entries.filter((e) => e.billId !== billId) : f.entries.map((e) => (e.billId === billId ? { ...e, billId: undefined } : e)) };
}

export const sortBills = (bills: Bill[]) => [...bills].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

export type BillStatus = { kind: "paga" | "atrasada" | "hoje" | "aVencer"; days: number; label: string };
export function billStatus(bill: Bill, todayKey: string): BillStatus {
  const days = differenceInCalendarDays(parseISO(bill.dueDate), parseISO(todayKey));
  if (bill.paid) return { kind: "paga", days, label: "Paga" };
  if (days < 0) return { kind: "atrasada", days, label: `Atrasada há ${-days} ${-days === 1 ? "dia" : "dias"}` };
  if (days === 0) return { kind: "hoje", days, label: "Vence hoje" };
  return { kind: "aVencer", days, label: `Vence em ${days} ${days === 1 ? "dia" : "dias"}` };
}

/** Agenda reminder day: one day before the due date. */
export const billReminderDate = (dueDate: string) => format(addDays(parseISO(dueDate), -1), "yyyy-MM-dd");
export const billRemindersOn = (bills: Bill[], dateKey: string) => bills.filter((b) => !b.paid && billReminderDate(b.dueDate) === dateKey);

/** Fingerprint of the shopping list, used to warn when a registered list was edited later. */
export const shoppingSignature = (items: { name: string; amount: number; unit: string }[]) => items.map((i) => `${i.name}|${i.amount}|${i.unit}`).sort().join(";");

const round = (n: number) => Math.round(n * 100) / 100;
export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** How far ahead months can be planned. */
export const MAX_MONTHS_AHEAD = 36;
export const shiftMonth = (month: string, delta: number) => format(addMonths(parseISO(`${month}-01`), delta), "yyyy-MM");
export const canGoToMonth = (month: string, currentMonth: string) => month <= shiftMonth(currentMonth, MAX_MONTHS_AHEAD);

/** Adds the same forecast to `month` and the next `repeat - 1` months, sharing one series id. */
export function addForecast(f: FinanceState, base: Omit<Forecast, "id" | "month" | "series">, month: string, repeat = 1, idSeed = Date.now()): FinanceState {
  const n = Math.max(1, Math.min(MAX_MONTHS_AHEAD + 1, Math.floor(repeat)));
  const series = n > 1 ? `s-${idSeed}` : undefined;
  const items: Forecast[] = Array.from({ length: n }, (_, i) => ({ ...base, id: `p-${idSeed}-${i}`, month: shiftMonth(month, i), series }));
  return { ...f, forecasts: [...(f.forecasts ?? []), ...items] };
}

/** Removes one forecast, or it and every later month of the same series. */
export function removeForecast(f: FinanceState, id: string, fromHereOn = false): FinanceState {
  const all = f.forecasts ?? [];
  const it = all.find((x) => x.id === id);
  if (!it) return f;
  return { ...f, forecasts: all.filter((x) => x.id !== id && !(fromHereOn && it.series && x.series === it.series && x.month >= it.month)) };
}

/** Planned vs actual for one month. */
export function forecastSummary(f: FinanceState, month: string) {
  const items = (f.forecasts ?? []).filter((x) => x.month === month);
  const income = round(items.filter((x) => x.type === "receita").reduce((n, x) => n + x.amount, 0));
  const costs = round(items.filter((x) => x.type === "gasto").reduce((n, x) => n + x.amount, 0));
  const actual = monthSummary(f.entries, month);
  return { items, income, costs, balance: round(income - costs), actual };
}

/** Next months: planned income, costs, balance and the running total of planned balances. */
export function forecastHorizon(f: FinanceState, fromMonth: string, months: number) {
  let cumulative = 0;
  return Array.from({ length: months }, (_, i) => {
    const month = shiftMonth(fromMonth, i);
    const s = forecastSummary(f, month);
    cumulative = round(cumulative + s.balance);
    return { month, income: s.income, costs: s.costs, balance: s.balance, cumulative };
  });
}

/** Average monthly spending over the last `months` full months before `currentMonth` that had any expense. */
export function averageMonthlySpending(entries: FinanceEntry[], currentMonth: string, months = 3) {
  const totals = Array.from({ length: months }, (_, i) => monthSummary(entries, shiftMonth(currentMonth, -(i + 1))).spent).filter((v) => v > 0);
  return totals.length ? round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
}

/** Goal progress and, when a deadline exists, the monthly amount still needed (deadline month included). */
export function goalProgress(g: FinanceGoal, currentMonth: string) {
  const remaining = round(Math.max(0, g.target - g.saved));
  const percent = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
  let perMonth: number | null = null;
  if (g.deadline && remaining > 0) {
    const [y1, m1] = currentMonth.split("-").map(Number) as [number, number];
    const [y2, m2] = g.deadline.split("-").map(Number) as [number, number];
    const left = (y2 - y1) * 12 + (m2 - m1) + 1;
    perMonth = left > 0 ? round(remaining / left) : remaining;
  }
  return { remaining, percent, perMonth, done: remaining === 0 && g.target > 0 };
}

export function contributeGoal(f: FinanceState, id: string, delta: number): FinanceState {
  return { ...f, goals: (f.goals ?? []).map((g) => (g.id === id ? { ...g, saved: round(Math.max(0, g.saved + delta)) } : g)) };
}
