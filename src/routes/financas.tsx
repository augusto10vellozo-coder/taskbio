import { ModuleHeader } from "@/components/ModuleHeader";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";
import { FIXED_CATEGORIES, brl, dailyAllowance, emptyFinance, monthSummary } from "@/lib/finance";

export const Route = createFileRoute("/financas")({
  head: () => ({ meta: [
    { title: "Finanças — TaskBio" },
    { name: "description", content: "Registre gastos em dois toques, acompanhe o mês por categoria e lembre das contas a pagar." },
    { property: "og:title", content: "Finanças pessoais — TaskBio" },
    { property: "og:description", content: "Gastos, contas a pagar e quanto ainda dá para gastar hoje." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Financas,
});

const field = "h-10 rounded-md bg-background px-3 text-sm ring-1 ring-line";
const num = (v: string) => Number(v.replace(",", "."));

function Financas() {
  const { finance: raw, setFinance } = useTaskBio();
  const f = { ...emptyFinance, ...raw };
  const [today, setToday] = useState<Date | null>(null);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState(FIXED_CATEGORIES[0]!);
  const [type, setType] = useState<"gasto" | "receita">("gasto");
  const [newCat, setNewCat] = useState("");
  const [bill, setBill] = useState({ title: "", amount: "", dueDate: "" });
  useEffect(() => setToday(new Date()), []);
  if (!today) return <main className="mx-auto max-w-4xl px-5 pt-8"><div className="h-60 animate-pulse rounded-lg bg-mist" /></main>;
  const month = toDateKey(today).slice(0, 7);
  const sum = monthSummary(f.entries, month);
  const allowance = dailyAllowance(f.monthlyBudget, sum.spent, today);
  const cats = [...FIXED_CATEGORIES, ...f.customCategories];
  const max = Math.max(1, ...sum.categories.map((c) => c.total));

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <ModuleHeader title="Finanças" />
      <section className="pb-5"><h2 className="font-display text-lg font-semibold">Seu mês em reais</h2><p className="mt-2 text-sm text-steel">Controle simples e pessoal; não é orientação financeira.</p></section>

      <form className="rounded-lg bg-card p-4 ring-1 ring-line" onSubmit={(e) => { e.preventDefault(); const v = num(amount); if (!(v > 0)) { toast.error("Informe um valor"); return; } setFinance((s) => ({ ...s, entries: [{ id: `f-${Date.now()}`, date: toDateKey(new Date()), amount: v, description: desc.trim() || cat, category: type === "receita" ? "Receita" : cat, type }, ...s.entries] })); setAmount(""); setDesc(""); toast.success(type === "gasto" ? "Gasto registrado" : "Receita registrada"); }}>
        <div className="mb-3 grid grid-cols-2 rounded-lg bg-mist p-1 sm:w-64">{(["gasto", "receita"] as const).map((t) => <button key={t} type="button" onClick={() => setType(t)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${type === t ? "bg-card text-ink shadow-sm" : "text-steel"}`}>{t === "gasto" ? "Gasto" : "Receita"}</button>)}</div>
        <div className="grid gap-2 sm:grid-cols-[120px_1fr_160px_auto]">
          <input inputMode="decimal" aria-label="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="R$ 0,00" className={field} />
          <input aria-label="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição (opcional)" className={field} />
          {type === "gasto" ? <select aria-label="Categoria" value={cat} onChange={(e) => setCat(e.target.value)} className={field}>{cats.map((c) => <option key={c}>{c}</option>)}</select> : <span />}
          <Button><Plus /> Registrar</Button>
        </div>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs"><input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nova categoria" className="h-8 min-w-0 rounded-md bg-background px-2 ring-1 ring-line" /><Button type="button" size="sm" variant="outline" onClick={() => { const c = newCat.trim(); if (!c || cats.includes(c)) return; setFinance((s) => ({ ...s, customCategories: [...s.customCategories, c] })); setCat(c); setNewCat(""); }}>Adicionar categoria</Button></div>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Gasto no mês" value={brl(sum.spent)} />
        <Stat label="Saldo do mês" value={sum.income ? brl(sum.balance) : "Registre uma receita"} />
        <section className="rounded-lg bg-card p-4 ring-1 ring-line"><p className="text-xs font-medium text-steel">Quanto ainda posso gastar hoje</p><p className="mt-1 font-display text-2xl font-semibold">{allowance === null ? "—" : brl(allowance)}</p><label className="mt-2 block text-xs text-steel">Orçamento mensal<input inputMode="decimal" defaultValue={f.monthlyBudget || ""} onBlur={(e) => setFinance((s) => ({ ...s, monthlyBudget: Math.max(0, num(e.target.value) || 0) }))} placeholder="R$" className="ml-2 h-7 w-24 rounded-md bg-background px-2 ring-1 ring-line" /></label></section>
      </div>

      <section className="mt-4 rounded-lg bg-card p-4 ring-1 ring-line"><h2 className="font-display text-lg font-semibold">Gastos por categoria</h2>
        {sum.categories.length === 0 ? <p className="mt-2 text-sm text-steel">Nenhum gasto neste mês ainda.</p> : <ul className="mt-3 space-y-2">{sum.categories.map((c) => <li key={c.category} className="text-sm"><div className="flex justify-between"><span>{c.category}</span><span className="font-medium">{brl(c.total)}</span></div><div className="mt-1 h-2 rounded-full bg-mist"><div className="h-2 rounded-full bg-brand" style={{ width: `${(c.total / max) * 100}%` }} /></div></li>)}</ul>}
      </section>

      <section className="mt-4 rounded-lg bg-card p-4 ring-1 ring-line"><h2 className="font-display text-lg font-semibold">Contas a pagar</h2><p className="text-xs text-steel">Com os avisos ativados no Perfil, você recebe uma notificação às 9h do dia anterior ao vencimento.</p>
        <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px_160px_auto]" onSubmit={(e) => { e.preventDefault(); const v = num(bill.amount); if (!bill.title.trim() || !(v > 0) || !bill.dueDate) { toast.error("Preencha conta, valor e vencimento"); return; } setFinance((s) => ({ ...s, bills: [...s.bills, { id: `c-${Date.now()}`, title: bill.title.trim(), amount: v, dueDate: bill.dueDate }].sort((a, b) => a.dueDate.localeCompare(b.dueDate)) })); setBill({ title: "", amount: "", dueDate: "" }); toast.success("Conta adicionada"); }}>
          <input aria-label="Conta" value={bill.title} onChange={(e) => setBill({ ...bill, title: e.target.value })} placeholder="Conta (ex.: luz)" className={field} />
          <input aria-label="Valor da conta" inputMode="decimal" value={bill.amount} onChange={(e) => setBill({ ...bill, amount: e.target.value })} placeholder="R$" className={field} />
          <input aria-label="Vencimento" type="date" value={bill.dueDate} onChange={(e) => setBill({ ...bill, dueDate: e.target.value })} className={field} />
          <Button><Plus /> Adicionar</Button>
        </form>
        <ul className="mt-3 divide-y divide-line">{f.bills.map((b) => <li key={b.id} className="flex items-center gap-3 py-2 text-sm"><input type="checkbox" checked={!!b.paid} aria-label={`${b.title} paga`} onChange={() => setFinance((s) => ({ ...s, bills: s.bills.map((x) => x.id === b.id ? { ...x, paid: !x.paid } : x) }))} /><span className={`flex-1 ${b.paid ? "text-steel line-through" : ""}`}>{b.title} · vence {b.dueDate.split("-").reverse().join("/")}</span><span className="font-medium">{brl(b.amount)}</span><Button variant="ghost" size="icon" className="size-7" aria-label={`Remover ${b.title}`} onClick={() => setFinance((s) => ({ ...s, bills: s.bills.filter((x) => x.id !== b.id) }))}><Trash2 /></Button></li>)}</ul>
      </section>

      <section className="mt-4 rounded-lg bg-card p-4 ring-1 ring-line"><h2 className="font-display text-lg font-semibold">Últimos registros</h2>
        <ul className="mt-2 divide-y divide-line">{f.entries.slice(0, 20).map((e) => <li key={e.id} className="flex items-center gap-3 py-2 text-sm"><span className="flex-1">{e.description} <span className="text-xs text-steel">· {e.category} · {e.date.split("-").reverse().join("/")}</span></span><span className={e.type === "receita" ? "font-medium text-brand-deep" : "font-medium"}>{e.type === "receita" ? "+" : "−"}{brl(e.amount)}</span><Button variant="ghost" size="icon" className="size-7" aria-label={`Remover ${e.description}`} onClick={() => setFinance((s) => ({ ...s, entries: s.entries.filter((x) => x.id !== e.id) }))}><Trash2 /></Button></li>)}</ul>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <section className="min-w-0 rounded-lg bg-card p-4 ring-1 ring-line"><p className="text-xs font-medium text-steel">{label}</p><p className={`mt-1 font-display font-semibold break-words leading-tight ${value.length > 14 ? "text-lg" : "text-2xl"}`}>{value}</p></section>;
}
