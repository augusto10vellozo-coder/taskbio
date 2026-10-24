import { ModuleHeader } from "@/components/ModuleHeader";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";
import { FIXED_CATEGORIES, billStatus, brl, budgetFor, dailyAllowance, emptyFinance, monthSummary, payBill, removeBill, setBudget, sortBills, unpayBill, validAmount, type Bill } from "@/lib/finance";

export const Route = createFileRoute("/financas")({
  head: () => ({ meta: [
    { title: "Finanças — TaskBio" },
    { name: "description", content: "Registre gastos em dois toques, acompanhe cada mês por categoria e lembre das contas a pagar." },
    { property: "og:title", content: "Finanças pessoais — TaskBio" },
    { property: "og:description", content: "Gastos, contas a pagar e quanto ainda dá para gastar hoje." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Financas,
});

// Keeps the chosen month while the app stays open (same session).
let sessionMonth: string | null = null;

const field = "h-10 rounded-md bg-background px-3 text-sm ring-1 ring-line";
const num = (v: string) => { const t = v.replace(/[R$\s]/g, ""); return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t); };
const monthLabel = (m: string) => { const s = format(parseISO(`${m}-01`), "MMMM 'de' yyyy", { locale: ptBR }); return s[0]!.toUpperCase() + s.slice(1); };
const emptyBill = { title: "", amount: "", dueDate: "", category: "Contas fixas" };

function Financas() {
  const { finance: raw, setFinance } = useTaskBio();
  const f = { ...emptyFinance, ...raw };
  const [today, setToday] = useState<Date | null>(null);
  const [month, setMonthState] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("Outros");
  const [type, setType] = useState<"gasto" | "receita">("gasto");
  const [newCat, setNewCat] = useState("");
  const [bill, setBill] = useState(emptyBill);
  const [editingBill, setEditingBill] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const d = new Date(); setToday(d); setMonthState(sessionMonth ?? toDateKey(d).slice(0, 7)); }, []);
  if (!today || !month) return <main className="mx-auto max-w-4xl px-5 pt-8"><div className="h-60 animate-pulse rounded-lg bg-mist" /></main>;

  const todayKey = toDateKey(today);
  const currentMonth = todayKey.slice(0, 7);
  const isCurrent = month === currentMonth;
  const changeMonth = (delta: number) => {
    const next = format(addMonths(parseISO(`${month}-01`), delta), "yyyy-MM");
    if (next > currentMonth) return;
    sessionMonth = next; setMonthState(next); setAmount(""); setDesc(""); setType("gasto"); setCat("Outros"); setBudgetInput(null);
  };
  const sum = monthSummary(f.entries, month);
  const budget = budgetFor(f, month, currentMonth);
  const allowance = isCurrent ? dailyAllowance(budget, sum.spent, today) : null;
  const cats = [...FIXED_CATEGORIES, ...f.customCategories];
  const max = Math.max(1, ...sum.categories.map((c) => c.total));
  const monthName = format(parseISO(`${month}-01`), "MMMM", { locale: ptBR });
  const monthEntries = f.entries.filter((e) => e.date.startsWith(month));

  const saveBudget = () => {
    const v = num(budgetInput ?? "");
    if (!validAmount(v)) { toast.error("Informe um orçamento entre R$ 0,01 e R$ 1.000.000,00"); return; }
    setFinance((s) => setBudget(s, month, v)); setBudgetInput(null);
    toast.success(`Orçamento de ${monthName}: ${brl(v)}`);
  };

  const submitBill = (e: React.FormEvent) => {
    e.preventDefault();
    const v = num(bill.amount);
    if (!bill.title.trim() || !validAmount(v) || !bill.dueDate) { toast.error("Preencha conta, valor válido e data de vencimento"); return; }
    const data = { title: bill.title.trim(), amount: v, dueDate: bill.dueDate, category: bill.category || "Contas fixas" };
    if (editingBill) {
      setFinance((s) => ({ ...s, bills: s.bills.map((x) => (x.id === editingBill ? { ...x, ...data } : x)), entries: s.entries.map((x) => (x.billId === editingBill ? { ...x, amount: data.amount, description: data.title, category: data.category } : x)) }));
      toast.success("Conta atualizada");
    } else {
      setFinance((s) => ({ ...s, bills: [...s.bills, { id: `c-${Date.now()}`, ...data }] }));
      toast.success("Conta adicionada · lembrete na Agenda um dia antes");
    }
    setBill(emptyBill); setEditingBill(null);
  };

  const deleteBill = (b: Bill) => {
    if (b.paid && f.entries.some((x) => x.billId === b.id)) {
      const removeExpense = window.confirm(`Excluir "${b.title}". Remover também o gasto lançado de ${brl(b.amount)}?\n\nOK = remover o gasto · Cancelar = manter o gasto`);
      setFinance((s) => removeBill(s, b.id, removeExpense));
    } else setFinance((s) => removeBill(s, b.id, true));
    toast.success("Conta excluída");
  };

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <ModuleHeader title="Finanças" />
      <div className="mb-4 flex items-center justify-between rounded-lg bg-card p-2 ring-1 ring-line">
        <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => changeMonth(-1)}><ChevronLeft /></Button>
        <h2 className="font-display text-lg font-semibold">{monthLabel(month)}</h2>
        <Button variant="ghost" size="icon" aria-label="Próximo mês" disabled={isCurrent} onClick={() => changeMonth(1)}><ChevronRight /></Button>
      </div>

      <form className="rounded-lg bg-card p-4 ring-1 ring-line" onSubmit={(e) => {
        e.preventDefault(); const v = num(amount);
        if (!validAmount(v)) { toast.error("Informe um valor entre R$ 0,01 e R$ 1.000.000,00"); return; }
        const date = isCurrent ? todayKey : `${month}-01`;
        const category = type === "receita" ? "Receita" : cat || "Outros";
        setFinance((s) => ({ ...s, entries: [{ id: `f-${Date.now()}`, date, amount: v, description: desc.trim() || category, category, type }, ...s.entries] }));
        setAmount(""); setDesc(""); toast.success(`${type === "gasto" ? "Gasto" : "Receita"} de ${brl(v)} registrado${type === "receita" ? "a" : ""}`);
      }}>
        <div className="mb-3 grid grid-cols-2 rounded-lg bg-mist p-1 sm:w-64">{(["gasto", "receita"] as const).map((t) => <button key={t} type="button" onClick={() => setType(t)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${type === t ? "bg-card text-ink shadow-sm" : "text-steel"}`}>{t === "gasto" ? "Gasto" : "Receita"}</button>)}</div>
        <div className="grid gap-2 sm:grid-cols-[120px_1fr_160px_auto]">
          <input ref={amountRef} inputMode="decimal" aria-label="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="R$ 0,00" className={field} />
          <input aria-label="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição (opcional)" className={field} />
          {type === "gasto" ? <select aria-label="Categoria" value={cat} onChange={(e) => setCat(e.target.value)} className={field}>{cats.map((c) => <option key={c}>{c}</option>)}</select> : <span />}
          <Button><Plus /> Registrar</Button>
        </div>
        {!isCurrent && <p className="mt-2 text-xs text-steel">Registros feitos aqui entram em {monthLabel(month)} (dia 1).</p>}
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs"><input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nova categoria" className="h-8 min-w-0 rounded-md bg-background px-2 ring-1 ring-line" /><Button type="button" size="sm" variant="outline" onClick={() => { const c = newCat.trim(); if (!c || cats.includes(c)) return; setFinance((s) => ({ ...s, customCategories: [...s.customCategories, c] })); setCat(c); setNewCat(""); }}>Adicionar categoria</Button></div>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <section className="min-w-0 rounded-lg bg-card p-4 ring-1 ring-line"><p className="text-xs font-medium text-steel">Gasto no mês</p><p className="mt-1 font-display text-2xl font-semibold">{brl(sum.spent)}</p></section>
        <section className="min-w-0 rounded-lg bg-card p-4 ring-1 ring-line"><p className="text-xs font-medium text-steel">Saldo do mês</p>
          <p className={`mt-1 font-display text-2xl font-semibold ${!sum.income && !sum.spent ? "text-steel" : sum.balance < 0 ? "text-destructive" : ""}`}>{sum.balance < 0 ? "−" : ""}{brl(Math.abs(sum.balance))}</p>
          {!sum.income && <p className="mt-1 text-xs text-steel">Registre uma receita para calcular o saldo</p>}
        </section>
        <section className="min-w-0 rounded-lg bg-card p-4 ring-1 ring-line"><p className="text-xs font-medium text-steel">{isCurrent ? "Quanto ainda posso gastar hoje" : "Orçamento do mês"}</p>
          {budget > 0 && budgetInput === null ? <>
            <p className="mt-1 font-display text-2xl font-semibold">{isCurrent ? brl(allowance ?? 0) : brl(Math.max(0, budget - sum.spent))}</p>
            <p className="text-xs text-steel">{isCurrent ? `${brl(allowance ?? 0)} por dia até o fim do mês` : `restante de ${brl(budget)}`}</p>
            <button type="button" className="mt-2 text-xs font-medium text-brand-deep underline" onClick={() => setBudgetInput(String(budget).replace(".", ","))}>Orçamento de {monthName}: {brl(budget)} · editar</button>
          </> : budgetInput === null ? <>
            <p className="mt-1 font-display text-2xl font-semibold text-steel">{brl(0)}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setBudgetInput("")}>Definir orçamento mensal</Button>
          </> : <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); saveBudget(); }}>
            <input autoFocus inputMode="decimal" aria-label={`Orçamento de ${monthName}`} value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} placeholder="R$" className="h-8 w-24 min-w-0 rounded-md bg-background px-2 text-sm ring-1 ring-line" />
            <Button size="sm">Salvar</Button><Button type="button" size="sm" variant="ghost" aria-label="Cancelar" onClick={() => setBudgetInput(null)}><X /></Button>
          </form>}
        </section>
      </div>

      <section className="mt-4 rounded-lg bg-card p-4 ring-1 ring-line"><h2 className="font-display text-lg font-semibold">Gastos por categoria</h2>
        {sum.categories.length === 0 ? <div className="mt-2"><p className="text-sm text-steel">Nenhum gasto neste mês ainda.</p><Button size="sm" variant="outline" className="mt-2" onClick={() => { setType("gasto"); amountRef.current?.focus(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Registrar um gasto</Button></div>
          : <ul className="mt-3 space-y-2">{sum.categories.map((c) => <li key={c.category} className="text-sm"><div className="flex justify-between gap-2"><span className="min-w-0 truncate">{c.category}</span><span className="shrink-0 font-medium">{brl(c.total)} <span className="text-xs text-steel">· {c.percent}%</span></span></div><div className="mt-1 h-2 rounded-full bg-mist"><div className="h-2 rounded-full bg-brand" style={{ width: `${(c.total / max) * 100}%` }} /></div></li>)}</ul>}
      </section>

      <section className="mt-4 rounded-lg bg-card p-4 ring-1 ring-line"><h2 className="font-display text-lg font-semibold">Contas a pagar</h2><p className="text-xs text-steel">A gente te lembra na Agenda um dia antes do vencimento.</p>
        <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px_150px_150px_auto]" onSubmit={submitBill}>
          <label className="text-xs text-steel">Conta<input value={bill.title} onChange={(e) => setBill({ ...bill, title: e.target.value })} placeholder="ex.: Luz" className={`${field} mt-1 w-full`} /></label>
          <label className="text-xs text-steel">Valor<input inputMode="decimal" value={bill.amount} onChange={(e) => setBill({ ...bill, amount: e.target.value })} placeholder="R$" className={`${field} mt-1 w-full`} /></label>
          <label className="text-xs text-steel">Data de vencimento<input type="date" required value={bill.dueDate} onChange={(e) => setBill({ ...bill, dueDate: e.target.value })} className={`${field} mt-1 w-full`} /></label>
          <label className="text-xs text-steel">Categoria<select value={bill.category} onChange={(e) => setBill({ ...bill, category: e.target.value })} className={`${field} mt-1 w-full`}>{cats.map((c) => <option key={c}>{c}</option>)}</select></label>
          <div className="flex items-end gap-1"><Button>{editingBill ? <Check /> : <Plus />} {editingBill ? "Salvar" : "Adicionar"}</Button>{editingBill && <Button type="button" variant="ghost" size="icon" aria-label="Cancelar edição" onClick={() => { setEditingBill(null); setBill(emptyBill); }}><X /></Button>}</div>
        </form>
        <ul className="mt-3 divide-y divide-line">{sortBills(f.bills).map((b) => { const st = billStatus(b, todayKey); return (
          <li key={b.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm ${st.kind === "paga" ? "opacity-60" : ""}`}>
            <div className="min-w-0 flex-1"><p className={`break-words font-medium ${st.kind === "paga" ? "line-through" : ""}`}>{st.kind === "paga" && <Check className="mr-1 inline size-4 text-good" />}{b.title}</p>
              <p className={`text-xs ${st.kind === "atrasada" ? "font-semibold text-destructive" : st.kind === "hoje" ? "font-semibold text-brand-deep" : "text-steel"}`}>{st.label} · {b.dueDate.split("-").reverse().join("/")} · {b.category || "Contas fixas"}</p></div>
            <span className="font-medium">{brl(b.amount)}</span>
            <Button size="sm" variant={b.paid ? "outline" : "default"} onClick={() => { if (b.paid) { setFinance((s) => unpayBill(s, b.id)); toast.success("Conta desmarcada · gasto removido"); } else { setFinance((s) => payBill(s, b.id, todayKey)); toast.success(`Conta paga · gasto de ${brl(b.amount)} lançado`); } }}>{b.paid ? "Desmarcar" : "Marcar como paga"}</Button>
            <Button variant="ghost" size="icon" className="size-7" aria-label={`Editar ${b.title}`} onClick={() => { setEditingBill(b.id); setBill({ title: b.title, amount: String(b.amount).replace(".", ","), dueDate: b.dueDate, category: b.category || "Contas fixas" }); }}><Pencil /></Button>
            <Button variant="ghost" size="icon" className="size-7" aria-label={`Remover ${b.title}`} onClick={() => deleteBill(b)}><Trash2 /></Button>
          </li>); })}</ul>
      </section>

      <section className="mt-4 rounded-lg bg-card p-4 ring-1 ring-line"><h2 className="font-display text-lg font-semibold">Últimos registros</h2>
        {monthEntries.length === 0 && <p className="mt-2 text-sm text-steel">Nenhum registro em {monthLabel(month)}.</p>}
        <ul className="mt-2 divide-y divide-line">{monthEntries.slice(0, 30).map((e) => <li key={e.id} className="flex items-center gap-3 py-2 text-sm"><span className="min-w-0 flex-1 break-words">{e.description} <span className="text-xs text-steel">· {e.category} · {e.date.split("-").reverse().join("/")}{e.billId ? " · conta" : ""}</span></span><span className={e.type === "receita" ? "font-medium text-brand-deep" : "font-medium"}>{e.type === "receita" ? "+" : "−"}{brl(e.amount)}</span><Button variant="ghost" size="icon" className="size-7" aria-label={`Remover ${e.description}`} onClick={() => setFinance((s) => e.billId ? unpayBill(s, e.billId) : { ...s, entries: s.entries.filter((x) => x.id !== e.id) })}><Trash2 /></Button></li>)}</ul>
      </section>
    </main>
  );
}
