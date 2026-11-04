import { ModuleHeader } from "@/components/ModuleHeader";
import { WeeklyGoals } from "@/components/WeeklyGoals";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEntryState } from "@/lib/navigation-context";
import { addDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brl, consolidateIngredients, formatIngredientAmount, type Block } from "@/lib/trilha-data";
import { useTaskBio } from "@/lib/trilha-store";
import { formatFullDate, getWeekDates, toDateKey } from "@/lib/calendar-utils";
import { exampleWeek } from "@/lib/example-week";
import { toast } from "sonner";
import { WeekActions } from "@/components/WeekActions";
import { AgendaGreeting } from "@/components/AgendaDayOverview";
import { mealSummary } from "@/lib/meal-summary";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Minha Agenda — TaskBio" },
      {
        name: "description",
        content:
          "Agenda semanal que reúne refeições, treinos, compromissos e descanso em uma única linha do dia, com calorias e custo estimado.",
      },
      { property: "og:title", content: "Minha Agenda — TaskBio" },
      {
        property: "og:description",
        content: "Organize alimentação, atividade física e rotina pessoal em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Agenda,
});

function Agenda() {
  const { plan, ready, replaceDays, clearWeek, getMeal } = useTaskBio();
  const [selectedDate, setSelectedDate] = useEntryState("agenda:date", () => {
    if (typeof window === "undefined") return new Date();
    const saved = sessionStorage.getItem("trilha:selected-date");
    if (saved) { sessionStorage.removeItem("trilha:selected-date"); return new Date(`${saved}T12:00:00`); }
    return new Date();
  });
  const navigate = useNavigate();
  /** Abre o dia escolhido na home, que é onde a linha do dia vive. */
  const openDay = (key: string) => { void navigate({ to: "/", search: { dia: key } }); };
  const mainRef = useRef<HTMLElement>(null);
  const dateHeaderRef = useRef<HTMLDivElement>(null);
  const dateStartRef = useRef<HTMLDivElement>(null);
  const [compactDates, setCompactDates] = useState(false);
  const [exampleDismissed, setExampleDismissed] = useState(false);
  useEffect(() => {
    setExampleDismissed(localStorage.getItem("trilha:example-dismissed") === "yes");
  }, []);

  useEffect(() => {
    if (!ready) return;
    const main = mainRef.current;
    const dateHeader = dateHeaderRef.current;
    const dateStart = dateStartRef.current;
    if (!main || !dateHeader || !dateStart) return;
    const measure = () => {
      main.style.setProperty("--agenda-scroll-offset", `${dateHeader.getBoundingClientRect().height + 16}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(dateHeader);
    const scrollObserver = new IntersectionObserver(([entry]) => {
      if (entry) setCompactDates(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    scrollObserver.observe(dateStart);
    measure();
    return () => { observer.disconnect(); scrollObserver.disconnect(); };
  }, [ready]);

  const dateKey = toDateKey(selectedDate);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const weekKeys = useMemo(() => weekDates.map(toDateKey), [weekDates]);
  const blocks = plan[dateKey] ?? [];
  const emptyWeek = ready && weekKeys.every((key) => (plan[key] ?? []).length === 0);
  const clone = (items: Block[]) => items.map((block) => ({ ...block, id: crypto.randomUUID(), done: false, recurrence: "none" as const }));
  const duplicateDay = () => {
    const source = plan[toDateKey(addDays(selectedDate, -1))] ?? [];
    if (!source.length) { toast.info("O dia anterior está vazio."); return; }
    if (blocks.length && !window.confirm("Substituir os itens deste dia pelos do dia anterior?")) return;
    replaceDays({ [dateKey]: clone(source) }); toast.success("Dia duplicado.");
  };
  const duplicateWeek = () => {
    const sources = weekDates.map((day) => plan[toDateKey(addDays(day, -7))] ?? []);
    if (sources.every((items) => !items.length)) { toast.info("A semana anterior está vazia."); return; }
    if (!window.confirm("Copiar a semana anterior para esta semana? Os dias desta semana serão substituídos.")) return;
    replaceDays(Object.fromEntries(weekKeys.map((key, index) => [key, clone(sources[index] ?? [])]))); toast.success("Semana duplicada.");
  };
  const fillExample = () => {
    if (!emptyWeek) return;
    replaceDays(exampleWeek(weekKeys));
    setExampleDismissed(true); localStorage.setItem("trilha:example-dismissed", "yes");
    toast.success("Semana de exemplo adicionada. Você pode editar ou limpar os itens.");
  };


  const semanaCusto = useMemo(() => mealSummary(weekKeys.flatMap((key) => plan[key] ?? []), getMeal).cost, [getMeal, plan, weekKeys]);

  const compras = useMemo(() => consolidateIngredients(
    weekKeys.flatMap((key) => plan[key] ?? []).map((block) => getMeal(block.mealId)).filter((meal) => meal != null),
  ).slice(0, 5), [getMeal, plan, weekKeys]);

  if (!ready) {
    return <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8"><div className="h-48 animate-pulse rounded-2xl bg-mist" /></main>;
  }

  return (
    <main ref={mainRef} className="mx-auto max-w-6xl px-5 pb-44 sm:px-8">
      <AgendaGreeting showBack={false} />
      <div ref={dateStartRef} className="h-px" aria-hidden="true" />
      <div ref={dateHeaderRef} className="sticky top-0 z-35 -mx-5 border-b border-line bg-background px-5 pb-3 sm:-mx-8 sm:px-8" aria-label="Navegação de datas">
      {!compactDates && <ModuleHeader title="Minha Agenda" />}
      {compactDates && <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 pt-1">
        <Button variant="ghost" size="icon" className="size-11" onClick={() => setSelectedDate((date) => addDays(date, -1))} aria-label="Dia anterior" title="Dia anterior"><ChevronLeft /></Button>
        <h2 className="min-w-0 text-center font-display text-sm font-semibold first-letter:uppercase">{format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</h2>
        <Button variant="ghost" size="icon" className="size-11" onClick={() => setSelectedDate((date) => addDays(date, 1))} aria-label="Próximo dia" title="Próximo dia"><ChevronRight /></Button>
      </div>}
      <section className={compactDates ? "hidden" : undefined}>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="size-8 shrink-0 text-steel" aria-label="Ver mês" title="Ver mês"><Link to="/calendario"><CalendarDays className="size-4" /></Link></Button>
          <p className="min-w-0 flex-1 truncate text-sm capitalize text-steel">{formatFullDate(selectedDate)}</p>
          {!isSameDay(selectedDate, new Date()) && <Button variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-steel" onClick={() => setSelectedDate(new Date())}>Hoje</Button>}
          <WeekActions empty={emptyWeek} onDuplicateDay={duplicateDay} onDuplicateWeek={duplicateWeek} onClear={() => { clearWeek(weekKeys); toast.success("Semana limpa."); }} />
        </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1">
          <Button variant="ghost" size="icon" className="size-10 text-steel" onClick={() => setSelectedDate((date) => addDays(date, -7))} aria-label="Semana anterior" title="Semana anterior"><ChevronLeft /></Button>
          <p className="text-center text-sm font-medium">{format(weekDates[0]!, "d MMM", { locale: ptBR })} – {format(weekDates[6]!, "d MMM", { locale: ptBR })}</p>
          <Button variant="ghost" size="icon" className="size-10 text-steel" onClick={() => setSelectedDate((date) => addDays(date, 7))} aria-label="Próxima semana" title="Próxima semana"><ChevronRight /></Button>
        </div>
      </section>
      </div>
      <div>
        {emptyWeek && !exampleDismissed && <div className="mt-5 border-y border-line py-5"><p className="font-display font-semibold">Comece com uma semana de exemplo</p><p className="mt-1 text-sm text-steel">Refeições, atividades e descanso editáveis. Você pode limpar a semana a qualquer momento.</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={fillExample}>Preencher com semana de exemplo</Button><Button size="sm" variant="ghost" onClick={() => { localStorage.setItem("trilha:example-dismissed", "yes"); setExampleDismissed(true); }}>Agora não</Button></div></div>}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section aria-label="Semana" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 lg:col-span-8 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible">
          {weekDates.map((date) => {
            const key = toDateKey(date);
            const blocks = [...(plan[key] ?? [])].sort((a, b) => a.time.localeCompare(b.time));
            const done = blocks.filter((b) => b.done).length;
            const today = isSameDay(date, new Date());
            return <article key={key} className={`flex min-w-[190px] shrink-0 flex-col rounded-lg bg-card p-3 ring-1 lg:min-w-0 ${today ? "ring-brand" : "ring-line"}`}>
              <button type="button" onClick={() => openDay(key)} className="text-left">
                <span className="block text-[11px] font-medium uppercase text-steel">{format(date, "EEE", { locale: ptBR })}</span>
                <span className="block font-display text-lg font-semibold">{format(date, "d")}</span>
                <span className="block text-[11px] text-steel">{blocks.length ? `${done} de ${blocks.length}` : "Sem itens"}</span>
              </button>
              <ul className="mt-2 space-y-1">
                {blocks.slice(0, 6).map((b) => <li key={b.id}><button type="button" onClick={() => openDay(key)} className={`w-full truncate rounded px-1.5 py-1 text-left text-[11px] ${b.done ? "bg-good/10 text-good" : "bg-mist text-steel"}`}>{b.time} {b.title}</button></li>)}
                {blocks.length > 6 && <li className="px-1.5 text-[11px] text-steel">+{blocks.length - 6} itens</li>}
              </ul>
            </article>;
          })}
        </section>

        <aside className="space-y-5 lg:col-span-4">
          {compras.length > 0 && <div className="glass-strong rounded-2xl p-5 ring-1 ring-line">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold tracking-tight">Compras da semana</h2>
              <span className="text-sm font-semibold text-ink">{brl(semanaCusto)}</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {compras.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <span className="text-steel">{item.name}</span>
                  <span className="font-medium">{formatIngredientAmount(item.amount, item.unit)}</span>
                </li>
              ))}
            </ul>
          </div>}
        </aside>
      </div>
      <Button size="icon" className="fixed right-5 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 size-14 rounded-full border border-brand sm:right-8 xl:bottom-6" aria-label="Adicionar bloco" title="Adicionar bloco" onClick={() => openDay(dateKey)}><Plus className="size-6" /></Button>
      <WeeklyGoals />
    </main>
  );
}
