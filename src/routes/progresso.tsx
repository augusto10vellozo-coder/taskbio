import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTrilha } from "@/lib/trilha-store";
import { getWeekDates, toDateKey } from "@/lib/calendar-utils";

export const Route = createFileRoute("/progresso")({
  head: () => ({ meta: [
    { title: "Meu progresso — Trilha" },
    { name: "description", content: "Acompanhe treinos, minutos ativos, refeições e conclusão da rotina semanal." },
    { property: "og:title", content: "Meu progresso — Trilha" },
    { property: "og:description", content: "Visualize sua consistência em atividades, rotina e alimentação." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Progresso,
});

function Progresso() {
  const { plan, workouts, getMeal } = useTrilha();
  const weekDates = getWeekDates(new Date());
  const all = weekDates.flatMap((date) => plan[toDateKey(date)] ?? []); const done = all.filter((b) => b.done);
  const pct = all.length ? Math.round(done.length / all.length * 100) : 0;
  const stats = [
    ['Rotina concluída', `${pct}%`, `${done.length} de ${all.length} blocos`],
    ['Treinos realizados', `${done.filter((b) => b.kind === 'treino').length}`, `${workouts.length} treinos disponíveis`],
    ['Refeições registradas', `${done.filter((b) => b.kind === 'refeicao').length}`, `${all.filter((b) => b.kind === 'refeicao').length} planejadas`],
    ['Calorias planejadas', `${all.reduce((s,b) => s + (getMeal(b.mealId)?.macros.kcal ?? 0), 0).toLocaleString('pt-BR')}`, 'estimativa semanal'],
  ];
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <section className="pt-8 pb-4"><p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Meu progresso</p><h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Consistência que você consegue enxergar</h1></section>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{stats.map(([label, value, note]) => <article key={label} className="glass-strong rounded-2xl p-5 ring-1 ring-black/5"><p className="text-[11px] uppercase tracking-[0.14em] text-steel">{label}</p><p className="mt-2 font-display text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-steel">{note}</p></article>)}</div>
      <section className="mt-5 glass-strong rounded-2xl p-5 ring-1 ring-black/5"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Semana por dia</h2><span className="text-xs text-steel">blocos concluídos</span></div><div className="mt-6 grid h-56 grid-cols-7 items-end gap-2">{weekDates.map((date) => { const key = toDateKey(date); const total = (plan[key] ?? []).length; const complete = (plan[key] ?? []).filter((b) => b.done).length; const height = total ? Math.max(8, Math.round(complete / total * 100)) : 8; return <div key={key} className="flex h-full flex-col justify-end gap-2 text-center"><span className="text-xs font-medium text-steel">{complete}/{total}</span><div className="mx-auto flex w-full max-w-12 flex-col justify-end overflow-hidden rounded-t-lg bg-mist" style={{height:'160px'}}><div className="w-full bg-brand" style={{height:`${height}%`}} /></div><span className="text-xs font-medium">{format(date, "EEE", { locale: ptBR }).replace(".", "")}</span></div>; })}</div></section>
    </main>
  );
}