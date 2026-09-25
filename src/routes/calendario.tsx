import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrilha } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";

export const Route = createFileRoute("/calendario")({
  head: () => ({ meta: [
    { title: "Calendário mensal — Trilha" },
    { name: "description", content: "Veja compromissos, refeições, atividades e descanso em um calendário mensal." },
    { property: "og:title", content: "Calendário mensal — Trilha" },
    { property: "og:description", content: "Uma visão mensal completa da sua rotina saudável." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MonthlyCalendar,
});

function MonthlyCalendar() {
  const { plan } = useTrilha();
  const [month, setMonth] = useState(() => new Date());
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }), [month]);
  return <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
    <section className="flex flex-col justify-between gap-4 pt-8 pb-5 sm:flex-row sm:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Minha agenda</p><h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Visão mensal</h1><p className="mt-2 text-sm text-steel">Selecione um dia para abrir e organizar seus detalhes.</p></div><Button asChild variant="outline"><Link to="/"><CalendarDays /> Ver semana</Link></Button></section>
    <section className="rounded-lg bg-card p-3 ring-1 ring-line sm:p-5">
      <header className="flex items-center justify-between gap-3 pb-4"><Button variant="ghost" size="icon" onClick={() => setMonth((current) => subMonths(current, 1))} aria-label="Mês anterior"><ChevronLeft /></Button><h2 className="font-display text-xl font-semibold capitalize">{format(month, "MMMM 'de' yyyy", { locale: ptBR })}</h2><Button variant="ghost" size="icon" onClick={() => setMonth((current) => addMonths(current, 1))} aria-label="Próximo mês"><ChevronRight /></Button></header>
      <div className="grid grid-cols-7 border-b border-line pb-2 text-center text-[10px] font-medium uppercase text-steel">{["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="grid grid-cols-7">{days.map((day) => { const key = toDateKey(day); const blocks = plan[key] ?? []; const done = blocks.filter((block) => block.done).length; return <Link key={key} to="/" className={`min-h-24 border-b border-r border-line p-1.5 transition-colors hover:bg-mist sm:min-h-32 sm:p-2 ${isSameMonth(day, month) ? "" : "opacity-35"}`} onClick={() => sessionStorage.setItem("trilha:selected-date", key)}><div className="flex items-center justify-between"><span className="text-xs font-semibold">{format(day, "d")}</span>{blocks.length > 0 && <span className="text-[9px] text-steel">{done}/{blocks.length}</span>}</div><div className="mt-2 space-y-1">{blocks.slice(0, 3).map((block) => <p key={block.id} className={`truncate rounded-sm px-1 py-0.5 text-[9px] sm:text-[10px] ${block.done ? "bg-good/10 text-good" : "bg-mist text-steel"}`}>{block.time} {block.title}</p>)}{blocks.length > 3 && <p className="text-[9px] text-steel">+{blocks.length - 3} itens</p>}</div></Link>; })}</div>
    </section>
  </main>;
}