import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Minus, PiggyBank, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addForecast, averageMonthlySpending, brl, contributeGoal, forecastHorizon, forecastSummary, goalProgress, removeForecast, validAmount, type FinanceState } from "@/lib/finance";

const field = "h-10 min-w-0 rounded-md bg-background px-3 text-sm ring-1 ring-line";
export const parseMoney = (v: string) => { const t = v.replace(/[R$\s]/g, ""); return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t); };
const shortMonth = (m: string) => { const s = format(parseISO(`${m}-01`), "MMM/yy", { locale: ptBR }); return s[0]!.toUpperCase() + s.slice(1); };
const signed = (n: number) => `${n < 0 ? "−" : ""}${brl(Math.abs(n))}`;

type Props = { f: FinanceState; setFinance: (fn: (s: FinanceState) => FinanceState) => void; month: string; currentMonth: string; cats: string[]; isFuture: boolean; monthName: string };

/** Planned income/costs for the selected month, with optional repetition across the next months. */
export function ForecastPanel({ f, setFinance, month, cats, isFuture, monthName }: Props) {
  const [type, setType] = useState<"gasto" | "receita">("gasto");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("Outros");
  const [repeat, setRepeat] = useState("1");
  const s = forecastSummary(f, month);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseMoney(amount);
    if (!validAmount(v)) { toast.error("Informe um valor entre R$ 0,01 e R$ 1.000.000,00"); return; }
    const category = type === "receita" ? "Receita" : cat || "Outros";
    const n = Math.max(1, Number(repeat) || 1);
    setFinance((st) => addForecast(st, { type, amount: v, description: desc.trim() || category, category }, month, n));
    setAmount(""); setDesc("");
    toast.success(n > 1 ? `Previsão adicionada em ${n} meses` : `Previsão adicionada em ${monthName}`);
  };
  const del = (id: string, series?: string) => {
    const later = series ? (f.forecasts ?? []).filter((x) => x.series === series && x.month > month).length : 0;
    const all = later > 0 && window.confirm(`Remover também dos próximos ${later} meses?\n\nOK = deste mês em diante · Cancelar = só este mês`);
    setFinance((st) => removeForecast(st, id, all));
  };
  const diff = (planned: number, actual: number) => planned > 0 ? `${brl(actual)} de ${brl(planned)} · ${Math.round((actual / planned) * 100)}%` : actual > 0 ? `${brl(actual)} realizado` : "—";

  return (
    <section className="mt-4 rounded-lg bg-card p-4 ring-1 ring-line">
      <h2 className="font-display text-lg font-semibold">{isFuture ? `Planejamento de ${monthName}` : "Previsto x realizado"}</h2>
      <p className="text-xs text-steel">{isFuture ? "Lance receitas e custos estimados. Viram realidade quando você registrar no mês." : "Compare o que você estimou com o que já aconteceu."}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-md bg-mist p-3"><p className="text-xs text-steel">Receitas previstas</p><p className="font-display text-xl font-semibold text-brand-deep">{brl(s.income)}</p>{!isFuture && <p className="text-xs text-steel">{diff(s.income, s.actual.income)}</p>}</div>
        <div className="rounded-md bg-mist p-3"><p className="text-xs text-steel">Custos previstos</p><p className="font-display text-xl font-semibold">{brl(s.costs)}</p>{!isFuture && <p className="text-xs text-steel">{diff(s.costs, s.actual.spent)}</p>}</div>
        <div className="rounded-md bg-mist p-3"><p className="text-xs text-steel">Saldo previsto</p><p className={`font-display text-xl font-semibold ${s.balance < 0 ? "text-destructive" : ""}`}>{signed(s.balance)}</p>{!isFuture && (s.actual.income > 0 || s.actual.spent > 0) && <p className="text-xs text-steel">Realizado: {signed(s.actual.balance)}</p>}</div>
      </div>

      <form className="mt-3 space-y-2" onSubmit={submit}>
        <div className="grid grid-cols-2 rounded-lg bg-mist p-1 sm:w-64">{(["gasto", "receita"] as const).map((t) => <button key={t} type="button" onClick={() => setType(t)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${type === t ? "bg-card text-ink shadow-sm" : "text-steel"}`}>{t === "gasto" ? "Custo" : "Receita"}</button>)}</div>
        <div className="grid gap-2 sm:grid-cols-[110px_1fr_150px_130px_auto]">
          <input inputMode="decimal" aria-label="Valor previsto" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="R$ 0,00" className={field} />
          <input aria-label="Descrição da previsão" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={type === "receita" ? "ex.: Salário" : "ex.: Aluguel"} className={field} />
          {type === "gasto" ? <select aria-label="Categoria da previsão" value={cat} onChange={(e) => setCat(e.target.value)} className={field}>{cats.map((c) => <option key={c}>{c}</option>)}</select> : <span className="hidden sm:block" />}
          <select aria-label="Repetir" value={repeat} onChange={(e) => setRepeat(e.target.value)} className={field}>
            <option value="1">Só este mês</option>
            {[3, 6, 12, 15, 18, 24].map((n) => <option key={n} value={n}>{n} meses</option>)}
          </select>
          <Button><Plus /> Prever</Button>
        </div>
      </form>

      {s.items.length > 0 && <ul className="mt-3 divide-y divide-line">{s.items.map((x) => (
        <li key={x.id} className="flex items-center gap-3 py-2 text-sm">
          <span className="min-w-0 flex-1 break-words">{x.description} <span className="text-xs text-steel">· {x.category}{x.series ? " · repete" : ""}</span></span>
          <span className={x.type === "receita" ? "font-medium text-brand-deep" : "font-medium"}>{x.type === "receita" ? "+" : "−"}{brl(x.amount)}</span>
          <Button variant="ghost" size="icon" className="size-7" aria-label={`Remover previsão ${x.description}`} onClick={() => del(x.id, x.series)}><Trash2 /></Button>
        </li>))}</ul>}
    </section>
  );
}

/** Six-month outlook from the selected month. */
export function ForecastHorizon({ f, month, onPick }: { f: FinanceState; month: string; onPick: (m: string) => void }) {
  const rows = forecastHorizon(f, month, 6);
  if (rows.every((r) => !r.income && !r.costs)) return null;
  return (
    <section className="mt-4 rounded-lg bg-card p-4 ring-1 ring-line">
      <h2 className="font-display text-lg font-semibold">Próximos meses</h2>
      <p className="text-xs text-steel">Toque num mês para abrir. O acumulado soma os saldos previstos.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead><tr className="text-left text-xs text-steel"><th className="py-1 font-medium">Mês</th><th className="py-1 text-right font-medium">Receitas</th><th className="py-1 text-right font-medium">Custos</th><th className="py-1 text-right font-medium">Saldo</th><th className="py-1 text-right font-medium">Acumulado</th></tr></thead>
          <tbody className="divide-y divide-line">{rows.map((r) => (
            <tr key={r.month} className="cursor-pointer hover:bg-mist" onClick={() => onPick(r.month)}>
              <td className="py-2 font-medium">{shortMonth(r.month)}</td>
              <td className="py-2 text-right text-brand-deep">{brl(r.income)}</td>
              <td className="py-2 text-right">{brl(r.costs)}</td>
              <td className={`py-2 text-right font-medium ${r.balance < 0 ? "text-destructive" : ""}`}>{signed(r.balance)}</td>
              <td className={`py-2 text-right ${r.cumulative < 0 ? "text-destructive" : "text-steel"}`}>{signed(r.cumulative)}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </section>
  );
}

/** Savings goals such as an emergency fund. Contributions only change the goal, not the month's entries. */
export function GoalsPanel({ f, setFinance, currentMonth }: Pick<Props, "f" | "setFinance" | "currentMonth">) {
  const goals = f.goals ?? [];
  const avg = averageMonthlySpending(f.entries, currentMonth);
  const [form, setForm] = useState<{ name: string; target: string; deadline: string } | null>(null);
  const [move, setMove] = useState<{ id: string; value: string } | null>(null);
  const openNew = (preset?: boolean) => setForm({ name: preset ? "Reserva de emergência" : "", target: preset && avg > 0 ? String(Math.round(avg * 6)).replace(".", ",") : "", deadline: "" });
  const save = (e: React.FormEvent) => {
    e.preventDefault(); if (!form) return;
    const t = parseMoney(form.target);
    if (!form.name.trim() || !validAmount(t)) { toast.error("Informe um nome e um valor de meta válido"); return; }
    setFinance((s) => ({ ...s, goals: [...(s.goals ?? []), { id: `g-${Date.now()}`, name: form.name.trim(), target: t, saved: 0, deadline: form.deadline || undefined }] }));
    setForm(null); toast.success("Meta criada");
  };
  const apply = (sign: 1 | -1) => {
    if (!move) return; const v = parseMoney(move.value);
    if (!validAmount(v)) { toast.error("Informe um valor válido"); return; }
    setFinance((s) => contributeGoal(s, move.id, sign * v)); setMove(null);
    toast.success(sign > 0 ? `${brl(v)} guardado` : `${brl(v)} retirado`);
  };

  return (
    <section className="mt-4 rounded-lg bg-card p-4 ring-1 ring-line">
      <div className="flex items-start justify-between gap-2">
        <div><h2 className="font-display text-lg font-semibold">Metas financeiras</h2><p className="text-xs text-steel">Guarde aos poucos e acompanhe quanto falta.</p></div>
        {!form && <Button size="sm" variant="outline" onClick={() => openNew()}><Plus /> Nova meta</Button>}
      </div>

      {!form && goals.length === 0 && (
        <button type="button" onClick={() => openNew(true)} className="mt-3 flex w-full items-center gap-3 rounded-md bg-mist p-3 text-left text-sm">
          <PiggyBank className="size-5 shrink-0 text-brand-deep" />
          <span><span className="font-medium">Começar uma reserva de emergência</span><br /><span className="text-xs text-steel">{avg > 0 ? `Referência comum: 6 meses de gastos ≈ ${brl(avg * 6)}` : "Referência comum: cerca de 6 meses dos seus gastos"}</span></span>
        </button>
      )}

      {form && <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_150px_auto]" onSubmit={save}>
        <label className="text-xs text-steel">Meta<input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex.: Viagem" className={`${field} mt-1 w-full`} /></label>
        <label className="text-xs text-steel">Valor da meta<input inputMode="decimal" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="R$" className={`${field} mt-1 w-full`} /></label>
        <label className="text-xs text-steel">Prazo (opcional)<input type="month" value={form.deadline} min={currentMonth} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={`${field} mt-1 w-full`} /></label>
        <div className="flex items-end gap-1"><Button>Criar</Button><Button type="button" variant="ghost" size="icon" aria-label="Cancelar" onClick={() => setForm(null)}><X /></Button></div>
      </form>}

      {goals.length > 0 && <ul className="mt-3 space-y-3">{goals.map((g) => { const p = goalProgress(g, currentMonth); return (
        <li key={g.id} className="rounded-md bg-mist p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><p className="break-words font-medium">{g.name}</p><p className="text-xs text-steel">{brl(g.saved)} de {brl(g.target)} · {p.percent}%</p></div>
            <Button variant="ghost" size="icon" className="size-7" aria-label={`Remover meta ${g.name}`} onClick={() => { if (window.confirm(`Excluir a meta "${g.name}"?`)) setFinance((s) => ({ ...s, goals: (s.goals ?? []).filter((x) => x.id !== g.id) })); }}><Trash2 /></Button>
          </div>
          <div className="mt-2 h-2 rounded-full bg-background"><div className="h-2 rounded-full bg-brand" style={{ width: `${p.percent}%` }} /></div>
          <p className="mt-1 text-xs text-steel">{p.done ? "Meta alcançada 🎉" : p.perMonth !== null ? `Faltam ${brl(p.remaining)} · ${brl(p.perMonth)} por mês até ${shortMonth(g.deadline!)}` : `Faltam ${brl(p.remaining)}`}</p>
          {move?.id === g.id ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <input autoFocus inputMode="decimal" aria-label={`Valor para ${g.name}`} value={move.value} onChange={(e) => setMove({ ...move, value: e.target.value })} placeholder="R$" className="h-8 w-28 min-w-0 rounded-md bg-background px-2 text-sm ring-1 ring-line" />
              <Button size="sm" onClick={() => apply(1)}><Plus /> Guardar</Button>
              <Button size="sm" variant="outline" onClick={() => apply(-1)}><Minus /> Retirar</Button>
              <Button size="sm" variant="ghost" aria-label="Cancelar" onClick={() => setMove(null)}><X /></Button>
            </div>
          ) : <Button size="sm" variant="outline" className="mt-2" onClick={() => setMove({ id: g.id, value: "" })}>Guardar ou retirar</Button>}
        </li>); })}</ul>}
    </section>
  );
}
