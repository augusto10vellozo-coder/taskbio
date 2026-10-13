import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Plus, Trash2 } from "lucide-react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTaskBio } from "@/lib/trilha-store";
import { getWeekDates, toDateKey } from "@/lib/calendar-utils";
import { lastDays } from "@/lib/engagement";
import { Tick } from "@/components/TodayPanel";

export const Route = createFileRoute("/habitos")({
  head: () => ({ meta: [
    { title: "Hábitos — TaskBio" },
    { name: "description", content: "Tabela semanal de hábitos para marcar com um toque e mapa de consistência do mês." },
    { property: "og:title", content: "Hábitos — TaskBio" },
    { property: "og:description", content: "Acompanhe seus hábitos diários como num planner de papel." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Habitos,
});

function Habitos() {
  const { habits, habitLog, addHabit, removeHabit, toggleHabit, toggleHabitStreak } = useTaskBio();
  const [ref, setRef] = useState<Date | null>(null);
  const [name, setName] = useState("");
  useEffect(() => setRef(new Date()), []);
  if (!ref) return <main className="mx-auto max-w-4xl px-5 pt-8"><div className="h-60 animate-pulse rounded-lg bg-mist" /></main>;
  const week = getWeekDates(ref);
  const month = lastDays(new Date(), 35);
  const max = Math.max(1, habits.length);

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <section className="pt-8 pb-5"><p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Hábitos</p><h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Tabela da semana</h1><p className="mt-2 text-sm text-steel">Toque na célula para marcar ou desmarcar o hábito do dia. A chama ao lado do nome indica se o hábito conta para a sequência de dias.</p></section>
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; addHabit(name.trim()); setName(""); toast.success("Hábito criado"); }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Novo hábito (ex.: beber água, ler 10 páginas)" className="h-10 flex-1 rounded-md bg-background px-3 text-sm ring-1 ring-line" />
        <Button><Plus /> Adicionar</Button>
      </form>
      <section className="overflow-x-auto rounded-lg bg-card p-4 ring-1 ring-line">
        <div className="mb-3 flex items-center justify-between"><Button variant="ghost" size="icon" aria-label="Semana anterior" onClick={() => setRef(addDays(ref, -7))}><ChevronLeft /></Button><span className="text-sm font-medium">{format(week[0]!, "d MMM", { locale: ptBR })} – {format(week[6]!, "d MMM", { locale: ptBR })}</span><Button variant="ghost" size="icon" aria-label="Próxima semana" onClick={() => setRef(addDays(ref, 7))}><ChevronRight /></Button></div>
        {habits.length === 0 ? <p className="py-8 text-center text-sm text-steel">Crie seu primeiro hábito acima.</p> : (
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr><th className="text-left font-medium text-steel">Hábito</th>{week.map((d) => <th key={d.toISOString()} className="w-12 text-center text-xs font-medium capitalize text-steel">{format(d, "EEEEEE", { locale: ptBR })}<br />{format(d, "d")}</th>)}<th className="w-8" /></tr></thead>
            <tbody>{habits.map((h) => <tr key={h.id} className="border-t border-line">
              <td className="py-2 pr-2"><span className="flex items-center gap-1.5">{h.name}<button type="button" onClick={() => { toggleHabitStreak(h.id); toast.success(h.countsForStreak === false ? "Agora conta para a sequência" : "Não conta mais para a sequência"); }} aria-pressed={h.countsForStreak !== false} aria-label={`${h.name}: ${h.countsForStreak === false ? "não conta" : "conta"} para a sequência de dias`} title={h.countsForStreak === false ? "Não conta para a sequência — toque para incluir" : "Conta para a sequência — toque para excluir"} className="rounded p-0.5"><Flame className={`size-4 ${h.countsForStreak === false ? "text-steel opacity-40" : "text-brand"}`} /></button></span></td>
              {week.map((d) => { const k = toDateKey(d); const on = (habitLog[k] ?? []).includes(h.id); return <td key={k} className="text-center"><button aria-label={`${h.name} em ${format(d, "d/MM")}`} className="inline-grid p-1" onClick={() => toggleHabit(k, h.id)}><Tick on={on} /></button></td>; })}
              <td><Button variant="ghost" size="icon" className="size-7" aria-label={`Remover ${h.name}`} onClick={() => { if (window.confirm(`Remover o hábito "${h.name}"?`)) removeHabit(h.id); }}><Trash2 /></Button></td>
            </tr>)}</tbody>
          </table>
        )}
      </section>
      <section className="mt-5 rounded-lg bg-card p-4 ring-1 ring-line">
        <h2 className="font-display text-lg font-semibold">Mapa de consistência</h2><p className="text-xs text-steel">Últimos 35 dias — quanto mais forte, mais hábitos marcados.</p>
        <div className="mt-3 grid grid-cols-7 gap-1.5 sm:max-w-sm">{month.map((k) => { const n = (habitLog[k] ?? []).length; const o = n === 0 ? 0 : 0.25 + 0.75 * Math.min(1, n / max); return <div key={k} title={`${k.split("-").reverse().join("/")}: ${n}`} className="aspect-square rounded-sm bg-mist"><div className="size-full rounded-sm bg-brand" style={{ opacity: o }} /></div>; })}</div>
      </section>
    </main>
  );
}
