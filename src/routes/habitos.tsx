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
import { ModuleHeader } from "@/components/ModuleHeader";

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
      <ModuleHeader title="Hábitos" />
      <section className="pb-5"><h2 className="font-display text-lg font-semibold">Tabela da semana</h2><p className="mt-2 text-sm text-steel">Toque na célula para marcar ou desmarcar o hábito do dia. A chama ao lado do nome indica se o hábito conta para a sequência de dias.</p></section>
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; addHabit(name.trim()); setName(""); toast.success("Hábito criado"); }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Novo hábito (ex.: beber água)" className="h-10 min-w-0 flex-1 rounded-md bg-background px-3 text-sm ring-1 ring-line" />
        <Button className="h-10 shrink-0"><Plus /> Adicionar</Button>
      </form>
      <section aria-label="Tabela semanal de hábitos" className="min-w-0 rounded-lg bg-card px-2 py-3 ring-1 ring-line sm:p-4">
        <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1"><Button variant="ghost" size="icon" aria-label="Semana anterior" onClick={() => setRef(addDays(ref, -7))}><ChevronLeft /></Button><span className="min-w-0 text-center text-xs font-medium sm:text-sm">{week[0] && format(week[0], "d MMM", { locale: ptBR })} – {week[6] && format(week[6], "d MMM", { locale: ptBR })}</span><Button variant="ghost" size="icon" aria-label="Próxima semana" onClick={() => setRef(addDays(ref, 7))}><ChevronRight /></Button></div>
        {habits.length === 0 ? <p className="py-8 text-center text-sm text-steel">Crie seu primeiro hábito acima.</p> : (
          <table className="w-full table-fixed text-xs sm:text-sm">
            <colgroup><col className="w-1/4" />{week.map((d) => <col key={toDateKey(d)} />)}</colgroup>
            <thead><tr><th scope="col" className="pb-2 text-left text-[10px] font-medium text-steel sm:text-xs">Hábito</th>{week.map((d, index) => <th scope="col" key={toDateKey(d)} className="px-0 pb-2 text-center text-[10px] font-medium text-steel sm:text-xs">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][index]}<br />{format(d, "d")}</th>)}</tr></thead>
            <tbody>{habits.map((h) => <tr key={h.id} className="border-t border-line">
              <th scope="row" className="py-2 pr-1 text-left font-normal"><span className="block break-words [overflow-wrap:anywhere]">{h.name}</span><span className="mt-1 flex items-center gap-0.5"><Button type="button" variant="ghost" size="icon" onClick={() => { toggleHabitStreak(h.id); toast.success(h.countsForStreak === false ? "Agora conta para a sequência" : "Não conta mais para a sequência"); }} aria-pressed={h.countsForStreak !== false} aria-label={`${h.name}: ${h.countsForStreak === false ? "não conta" : "conta"} para a sequência de dias`} title={h.countsForStreak === false ? "Não conta para a sequência — toque para incluir" : "Conta para a sequência — toque para excluir"} className="size-7 shrink-0"><Flame className={`size-4 ${h.countsForStreak === false ? "text-steel opacity-40" : "text-brand"}`} /></Button><Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Remover ${h.name}`} onClick={() => { if (window.confirm(`Remover o hábito "${h.name}"?`)) removeHabit(h.id); }}><Trash2 /></Button></span></th>
              {week.map((d) => { const k = toDateKey(d); const on = (habitLog[k] ?? []).includes(h.id); return <td key={k} className="px-0 text-center align-middle"><Button type="button" variant="ghost" aria-pressed={on} aria-label={`${h.name} em ${format(d, "d/MM")}`} className="mx-auto flex h-11 w-full max-w-11 gap-0 rounded-md p-0 [&_span]:shrink-0" onClick={() => toggleHabit(k, h.id)}><Tick on={on} /></Button></td>; })}
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
