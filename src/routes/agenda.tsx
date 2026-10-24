import { ModuleHeader } from "@/components/ModuleHeader";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { brl, consolidateIngredients, formatIngredientAmount, type Block } from "@/lib/trilha-data";
import { useTaskBio } from "@/lib/trilha-store";
import { formatFullDate, formatWeekRange, getWeekDates, toDateKey } from "@/lib/calendar-utils";
import { toast } from "sonner";
import { DayTimeline } from "@/components/DayTimeline";
import { WeekActions } from "@/components/WeekActions";
import { ReadingGoalBar } from "@/components/ReadingGoalBar";
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
  const { plan, ready, replaceDays, clearWeek, getMeal, goal } = useTaskBio();
  const [selectedDate, setSelectedDate] = useState(() => {
    if (typeof window === "undefined") return new Date();
    const saved = sessionStorage.getItem("trilha:selected-date");
    if (saved) { sessionStorage.removeItem("trilha:selected-date"); return new Date(`${saved}T12:00:00`); }
    return new Date();
  });
  const [adding, setAdding] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const dateHeaderRef = useRef<HTMLDivElement>(null);
  const [exampleDismissed, setExampleDismissed] = useState(false);
  const scrollToTimeline = () => requestAnimationFrame(() => document.getElementById("linha-do-dia")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }));
  const planDay = () => { setAdding(true); scrollToTimeline(); };
  useEffect(() => {
    setExampleDismissed(localStorage.getItem("trilha:example-dismissed") === "yes");
  }, []);

  useEffect(() => {
    if (!ready) return;
    const main = mainRef.current;
    const dateHeader = dateHeaderRef.current;
    const appHeader = document.querySelector("header.sticky");
    if (!main || !dateHeader || !appHeader) return;
    const measure = () => {
      const top = appHeader.getBoundingClientRect().height;
      main.style.setProperty("--agenda-top", `${top}px`);
      main.style.setProperty("--agenda-scroll-offset", `${top + dateHeader.getBoundingClientRect().height + 16}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(appHeader);
    observer.observe(dateHeader);
    measure();
    return () => observer.disconnect();
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
    const examples: Array<Array<Omit<Block, "id">>> = [
      [{ time: "07:30", kind: "refeicao", title: "Café da manhã", mealId: "m1", done: false }, { time: "18:00", kind: "treino", title: "Caminhada leve", done: false }],
      [{ time: "12:30", kind: "refeicao", title: "Almoço", mealId: "m2", done: false }],
      [{ time: "07:30", kind: "refeicao", title: "Café da manhã", mealId: "m1", done: false }, { time: "18:00", kind: "treino", title: "Mobilidade", done: false }],
      [{ time: "19:00", kind: "descanso", title: "Descanso", done: false }],
      [{ time: "12:30", kind: "refeicao", title: "Almoço", mealId: "m2", done: false }, { time: "18:00", kind: "treino", title: "Caminhada leve", done: false }],
      [{ time: "09:00", kind: "treino", title: "Atividade ao ar livre", done: false }],
      [{ time: "09:00", kind: "descanso", title: "Descanso", done: false }],
    ];
    replaceDays(Object.fromEntries(weekKeys.map((key, index) => [key, (examples[index] ?? []).map((block) => ({ ...block, id: crypto.randomUUID() }))])));
    setExampleDismissed(true); localStorage.setItem("trilha:example-dismissed", "yes");
    toast.success("Semana de exemplo adicionada. Você pode editar ou limpar os itens.");
  };

  const resumo = useMemo(() => {
    const { cost } = mealSummary(blocks, getMeal);
    return { cost, done: blocks.filter((b) => b.done).length };
  }, [blocks, getMeal]);

  const semanaCusto = useMemo(() => mealSummary(weekKeys.flatMap((key) => plan[key] ?? []), getMeal).cost, [getMeal, plan, weekKeys]);

  const compras = useMemo(() => consolidateIngredients(
    weekKeys.flatMap((key) => plan[key] ?? []).map((block) => getMeal(block.mealId)).filter((meal) => meal != null),
  ).slice(0, 5), [getMeal, plan, weekKeys]);

  if (!ready) {
    return <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8"><div className="h-48 animate-pulse rounded-2xl bg-mist" /></main>;
  }

  return (
    <main ref={mainRef} className="mx-auto max-w-6xl px-5 pb-44 sm:px-8">
      <div ref={dateHeaderRef} className="sticky top-[var(--agenda-top,4rem)] z-20 -mx-5 border-b border-line bg-background px-5 pb-3 sm:-mx-8 sm:px-8" aria-label="Navegação de datas">
      <ModuleHeader title="Minha Agenda" /><section>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <h2 className="max-w-[40ch] text-balance font-display text-xl font-semibold">
              {formatFullDate(selectedDate)}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button asChild variant="outline" size="sm"><Link to="/calendario"><CalendarDays /> Mês</Link></Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
            <div className="glass flex items-center rounded-lg p-1 ring-1 ring-black/5">
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setSelectedDate((date) => addDays(date, -7))} aria-label="Semana anterior" title="Semana anterior"><ChevronLeft /></Button>
              <span className="min-w-32 px-2 text-center text-xs font-medium text-steel">{formatWeekRange(selectedDate)}</span>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setSelectedDate((date) => addDays(date, 7))} aria-label="Próxima semana" title="Próxima semana"><ChevronRight /></Button>
            </div>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" size="icon" aria-label="Abrir calendário" title="Escolher data"><CalendarDays /></Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} defaultMonth={selectedDate} locale={ptBR} className="pointer-events-auto p-3" />
              </PopoverContent>
            </Popover>
            <WeekActions empty={emptyWeek} onDuplicateDay={duplicateDay} onDuplicateWeek={duplicateWeek} onClear={() => { clearWeek(weekKeys); toast.success("Semana limpa."); }} />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekDates.map((date) => {
            const active = isSameDay(date, selectedDate);
            const today = isSameDay(date, new Date());
            const count = (plan[toDateKey(date)] ?? []).length;
            return <Button key={toDateKey(date)} variant={active ? "default" : "outline"} onClick={() => setSelectedDate(date)} className="h-auto min-w-0 flex-col gap-0.5 px-1.5 py-2 sm:px-3" aria-pressed={active}>
              <span className="text-[10px] font-medium uppercase sm:text-xs">{["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][date.getDay()]}</span>
              <span className="font-display text-lg font-semibold sm:text-xl">{format(date, "dd")}</span>
              <span className="hidden text-[10px] font-normal sm:block">{format(date, "MMM", { locale: ptBR }).replace(".", "")}{today ? " · hoje" : count ? ` · ${count}` : ""}</span>
            </Button>;
          })}
        </div>
      </section>
      </div>
      <div className="py-4">
            <p className="mt-2 max-w-[48ch] text-pretty text-sm text-steel">
              {resumo.done} de {blocks.length} blocos concluídos
              {resumo.cost > 0 ? ` · ${brl(resumo.cost)}` : ""}
              {goal ? ` · 🎯 ${goal}` : ""}
            </p>
            <ReadingGoalBar />
        {emptyWeek && !exampleDismissed && <div className="mt-5 border-y border-line py-5"><p className="font-display font-semibold">Comece com uma semana de exemplo</p><p className="mt-1 text-sm text-steel">Refeições, atividades e descanso editáveis. Você pode limpar a semana a qualquer momento.</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={fillExample}>Preencher com semana de exemplo</Button><Button size="sm" variant="ghost" onClick={() => { localStorage.setItem("trilha:example-dismissed", "yes"); setExampleDismissed(true); }}>Agora não</Button></div></div>}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <DayTimeline
          dateKey={dateKey}
          adding={adding}
          onAddingChange={setAdding}
          id="linha-do-dia"
          className="scroll-mt-[var(--agenda-scroll-offset,24rem)] lg:col-span-7"
        />

        <aside className="space-y-5 lg:col-span-5">
          {compras.length > 0 && <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5">
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
            <p className="mt-3 text-[11px] text-steel">
              Valores estimados para planejamento — não substituem orientação de um profissional de saúde.
            </p>
          </div>}
        </aside>
      </div>
      <Button size="icon" className="fixed right-5 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 size-14 rounded-full shadow-lg sm:right-8 xl:bottom-6" aria-label="Adicionar bloco" title="Adicionar bloco" onClick={planDay}><Plus className="size-6" /></Button>
    </main>
  );
}
