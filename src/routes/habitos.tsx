import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useEntryState } from "@/lib/navigation-context";
import { ChevronLeft, ChevronRight, CheckSquare, Flame, Plus, LockKeyhole, Snowflake } from "lucide-react";
import { EmptyState, ModuleGate } from "@/components/EmptyState";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTaskBio } from "@/lib/trilha-store";
import { getWeekDates, toDateKey } from "@/lib/calendar-utils";
import { lastDays } from "@/lib/engagement";
import { Tick } from "@/components/TodayPanel";
import { ModuleHeader } from "@/components/ModuleHeader";
import { HabitForm } from "@/components/HabitForm";
import { canMarkHabit, changeHabitMark, habitConsistency, habitMilestone, habitStreak, habitBestStreak, weekMarks, weeklyTarget } from "@/lib/habits";
import { useHabitFreezes } from "@/lib/use-habit-freezes";
import { brasiliaDay } from "@/lib/xp";
import { emptyFreezeState } from "@/lib/habit-freezes";
import type { Habit } from "@/lib/engagement";

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
  const { habits, habitLog, addHabit, updateHabit, removeHabit, toggleHabit, toggleHabitStreak } = useTaskBio();
  const [ref, setRef] = useEntryState<Date | null>("habits:week", null);
  const [editing, setEditing] = useState<Habit | "new" | null>(null);
  const [explainFreeze, setExplainFreeze] = useState(false);
  const freezeQuery = useHabitFreezes();
  const protection = freezeQuery.data ?? emptyFreezeState;
  const frozenFor = (id: string) => protection.frozen.filter(f => f.habitId === id).map(f => f.day);
  useEffect(() => setRef(value => value ?? new Date()), []);
  if (!ref) return <main className="mx-auto max-w-4xl px-5 pt-8"><div className="h-60 animate-pulse rounded-lg bg-mist" /></main>;
  const week = getWeekDates(ref);
  const month = lastDays(new Date(), 35);
  const max = Math.max(1, habits.length);
  const today = brasiliaDay(new Date());
  const consistency = habitConsistency(habits, habitLog, today);
  const mark = (h: Habit, date: string) => {
    if (!canMarkHabit(h, habitLog, date)) return;
    const wasOn = habitLog[date]?.includes(h.id);
    toggleHabit(date, h.id);
    const n = habitStreak(h, changeHabitMark(h, habitLog, date), today);
    if (!wasOn && habitMilestone(h, n) && n > habitStreak(h, habitLog, today)) toast.success(`${h.emoji || "🔥"} ${h.name}: ${n} ${h.frequency === "weekly" ? "semanas" : "dias"} de constância!`);
  };

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <ModuleHeader title="Hábitos" />
      <ModuleGate id="habitos">
      <div className="mb-5">
        {freezeQuery.signedIn ? <>
          <Button variant="outline" className="min-h-11" aria-expanded={explainFreeze} onClick={() => setExplainFreeze(v => !v)}><Snowflake className="size-4 text-brand" />{freezeQuery.isError ? "Congelamentos indisponíveis" : freezeQuery.data ? `${protection.balance} congelamentos` : "Carregando congelamentos…"}</Button>
          {explainFreeze && <p className="mt-2 max-w-lg text-sm text-steel">Você ganha 1 congelamento a cada 10 hábitos concluídos. Se um dia passar em branco, a gente usa 1 para salvar sua sequência.</p>}
          {freezeQuery.data && protection.balance < 3 && <p className="mt-2 text-xs text-steel">{protection.progress}/10 para o próximo congelamento</p>}
        </> : <p className="text-sm text-steel">Entre na sua conta para proteger suas sequências.</p>}
      </div>
      <section className="pb-5"><h2 className="font-display text-lg font-semibold">Tabela da semana</h2><p className="mt-2 text-sm text-steel">Toque pra marcar o dia · 🔥 = conta pro seu streak</p></section>
      {habits.length > 0 && <Button variant="outline" className="mb-4 min-h-11" onClick={() => setEditing("new")}><Plus /> Novo hábito</Button>}
      {editing && <HabitForm habit={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onSave={patch => { if (editing === "new") addHabit(patch.name, patch); else updateHabit(editing.id, patch); }} />}
      {habits.length === 0 ? <EmptyState icon={CheckSquare} title="Comece com um hábito" context="Um hábito por vez, marcado na Agenda, constrói sua sequência." actionLabel="Criar primeiro hábito" onAction={() => setEditing("new")} /> : (
      <section aria-label="Tabela semanal de hábitos" className="min-w-0 rounded-lg bg-card px-2 py-3 ring-1 ring-line sm:p-4">
        <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1"><Button variant="ghost" size="icon" aria-label="Semana anterior" onClick={() => setRef(addDays(ref, -7))}><ChevronLeft /></Button><span className="min-w-0 text-center text-xs font-medium sm:text-sm">{week[0] && format(week[0], "d MMM", { locale: ptBR })} – {week[6] && format(week[6], "d MMM", { locale: ptBR })}</span><Button variant="ghost" size="icon" aria-label="Próxima semana" onClick={() => setRef(addDays(ref, 7))}><ChevronRight /></Button></div>
        {(
          <table className="w-full table-fixed text-xs sm:text-sm">
            <colgroup><col className="w-1/4" />{week.map((d) => <col key={toDateKey(d)} />)}</colgroup>
            <thead><tr><th scope="col" className="pb-2 text-left text-[10px] font-medium text-steel sm:text-xs">Hábito</th>{week.map((d, index) => <th scope="col" key={toDateKey(d)} className="px-0 pb-2 text-center text-[10px] font-medium text-steel sm:text-xs">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][index]}<br />{format(d, "d")}</th>)}</tr></thead>
            <tbody>{habits.map((h) => <tr key={h.id} className="border-t border-line">
              <th scope="row" className="py-2 pr-1 text-left font-normal">
                <Button variant="ghost" className="h-auto min-h-11 w-full justify-start whitespace-normal p-0 text-left text-xs sm:text-sm" aria-label={`Editar hábito ${h.name}`} onClick={() => setEditing(h)}><span className="min-w-0 break-words [overflow-wrap:anywhere]">{h.emoji && `${h.emoji} `}{h.name}</span></Button>
                <span className="block text-[10px] text-steel sm:text-xs">{h.frequency === "weekly" ? `${weeklyTarget(h)}x/semana` : "todo dia"}</span>
                {h.frequency === "weekly" && <span className="block text-[10px] text-steel sm:text-xs">{weekMarks(h, habitLog, toDateKey(ref))} de {weeklyTarget(h)}</span>}
                <Button type="button" variant="ghost" className={`h-8 gap-1 p-0 text-xs ${habitStreak(h, habitLog, today, frozenFor(h.id)) > 0 && h.countsForStreak !== false ? "text-brand" : "text-steel"}`} onClick={() => toggleHabitStreak(h.id)} aria-pressed={h.countsForStreak !== false} aria-label={`${h.name}: ${h.countsForStreak === false ? "não conta" : "conta"} para a sequência de dias`} title="Incluir ou excluir da sequência geral"><Flame className="size-3.5" />{habitStreak(h, habitLog, today, frozenFor(h.id))}</Button>
                <span className="block text-[10px] text-steel">Melhor: {habitBestStreak(h, habitLog, frozenFor(h.id))} {h.frequency === "weekly" ? "semanas" : "dias"}</span>
                <span className="block text-[10px] text-steel">Hoje: {habitLog[today]?.includes(h.id) ? "Concluído" : frozenFor(h.id).includes(today) ? "Congelado" : "Pendente"}</span>
                <div><Button variant="ghost" className="h-auto min-h-7 p-0 text-[10px] text-steel" aria-label={`Remover ${h.name}`} onClick={() => { if (window.confirm(`Remover o hábito "${h.name}"?`)) removeHabit(h.id); }}>Excluir</Button></div>
              </th>
              {week.map((d) => { const k = toDateKey(d); const on = (habitLog[k] ?? []).includes(h.id); const frozen = !on && frozenFor(h.id).includes(k); const blocked = !canMarkHabit(h, habitLog, k); return <td key={k} className="px-0 text-center align-middle"><Button type="button" variant="ghost" disabled={blocked} title={frozen ? "Congelado" : blocked ? "Meta batida" : on ? "Concluído" : "Pendente"} aria-pressed={on} aria-label={`${h.name} em ${format(d, "d/MM")}${frozen ? " — Congelado" : blocked ? " — meta batida" : ""}`} className="mx-auto flex h-11 w-full max-w-11 gap-0 rounded-md p-0 disabled:cursor-not-allowed disabled:opacity-30 [&_span]:shrink-0" onClick={() => mark(h, k)}>{frozen ? <Snowflake className="size-4 text-brand" /> : blocked ? <LockKeyhole className="size-4 text-steel" /> : <Tick on={on} />}</Button>{frozen && <span className="block text-[8px] text-steel">Congelado</span>}</td>; })}
            </tr>)}</tbody>
          </table>
        )}
      </section>
      )}
      <section className="mt-5 rounded-lg bg-card p-4 ring-1 ring-line">
        <h2 className="font-display text-lg font-semibold">Mapa de consistência</h2><p className="text-xs text-steel">{consistency.percent}% de constância · {consistency.recent ? "desde a criação" : "últimos 35 dias"}</p>
        <div className="mt-3 grid grid-cols-7 gap-1.5 sm:max-w-sm">{month.map((k) => { const n = (habitLog[k] ?? []).length; const o = n === 0 ? 0 : 0.25 + 0.75 * Math.min(1, n / max); return <div key={k} title={`${k.split("-").reverse().join("/")}: ${n}`} className="aspect-square rounded-sm bg-mist"><div className="size-full rounded-sm bg-brand" style={{ opacity: o }} /></div>; })}</div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-steel"><span>menos</span><span className="size-3 rounded-sm bg-brand/25" /><span className="size-3 rounded-sm bg-brand/60" /><span className="size-3 rounded-sm bg-brand" /><span>mais</span></div>
      </section>
      </ModuleGate>
    </main>
  );
}
