import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { brl, consolidateIngredients, formatIngredientAmount, type Block } from "@/lib/trilha-data";
import { useTaskBio } from "@/lib/trilha-store";
import { useAuth } from "@/lib/auth-context";
import { formatFullDate, formatWeekRange, getWeekDates, toDateKey } from "@/lib/calendar-utils";
import { AdSlot } from "@/components/AdSlot";
import { toast } from "sonner";
import { TodayPanel } from "@/components/TodayPanel";
import { DayTimeline } from "@/components/DayTimeline";
import { WeekActions } from "@/components/WeekActions";
import { mealSummary } from "@/lib/meal-summary";
import { agendaSummary } from "@/lib/agenda-overview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minha Semana — TaskBio" },
      {
        name: "description",
        content:
          "Agenda semanal que reúne refeições, treinos, compromissos e descanso em uma única linha do dia, com calorias e custo estimado.",
      },
      { property: "og:title", content: "Minha Semana — TaskBio" },
      {
        property: "og:description",
        content: "Organize alimentação, atividade física e rotina pessoal em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MinhaSemana,
});

const dotColor: Record<BlockKind, string> = {
  refeicao: "ring-good",
  treino: "ring-brand",
  compromisso: "ring-steel",
  descanso: "ring-line",
};

function MinhaSemana() {
  const { user, loading } = useAuth();
  const { plan, ready, replaceDays, clearWeek, getMeal, goal } = useTaskBio();
  const [selectedDate, setSelectedDate] = useState(() => {
    if (typeof window === "undefined") return new Date();
    const saved = sessionStorage.getItem("trilha:selected-date");
    if (saved) { sessionStorage.removeItem("trilha:selected-date"); return new Date(`${saved}T12:00:00`); }
    return new Date();
  });
  const [adding, setAdding] = useState(false);
  const [exampleDismissed, setExampleDismissed] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);
  const scrollToTimeline = () => requestAnimationFrame(() => document.getElementById("linha-do-dia")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }));
  const planDay = () => { setAdding(true); scrollToTimeline(); };
  useEffect(() => {
    setExampleDismissed(localStorage.getItem("trilha:example-dismissed") === "yes");
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

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
    const { cost, kcal } = mealSummary(blocks, getMeal);
    return { cost, kcal, done: blocks.filter((b) => b.done).length };
  }, [blocks, getMeal]);

  const weekStats = useMemo(() => {
    const all = weekKeys.flatMap((key) => plan[key] ?? []);
    const summary = agendaSummary(all);
    return {
      pct: summary.percent,
      done: summary.completed,
      treinos: summary.workouts,
      refeicoes: summary.meals,
      semanaCusto: mealSummary(all, getMeal).cost,
    };
  }, [getMeal, plan, weekKeys]);

  const compras = useMemo(() => consolidateIngredients(
    weekKeys.flatMap((key) => plan[key] ?? []).map((block) => getMeal(block.mealId)).filter((meal) => meal != null),
  ).slice(0, 5), [getMeal, plan, weekKeys]);

  if (loading) {
    return <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8"><div className="h-48 animate-pulse rounded-2xl bg-mist" /></main>;
  }

  return (
    <>
      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <TodayPanel />
        <section className="pt-8 pb-4">
          {!user && <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 text-sm text-steel"><span>Entre para salvar sua agenda e acessá-la em outros dispositivos.</span><Button asChild variant="outline" size="sm"><Link to="/auth">Entrar e sincronizar <ArrowRight /></Link></Button></div>}
          {installPrompt && !installed && <div className="mb-5 flex items-center justify-between gap-3 border-b border-line pb-3 text-sm"><span>Instalar TaskBio neste aparelho</span><Button variant="outline" size="sm" onClick={async () => { const prompt = installPrompt as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }; await prompt.prompt(); await prompt.userChoice; setInstallPrompt(null); }}>Instalar</Button></div>}
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Minha agenda</p>
              <h1 className="mt-2 max-w-[40ch] text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {formatFullDate(selectedDate)}
              </h1>
              <p className="mt-2 max-w-[48ch] text-pretty text-sm text-steel">
                {blocks.length} blocos planejados · {resumo.done} concluídos · custo do dia estimado em{" "}
                {brl(resumo.cost)}
                {goal ? ` · objetivo: ${goal}` : ""}
              </p>
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
          <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-2">
            {weekDates.map((date) => {
              const active = isSameDay(date, selectedDate);
              const today = isSameDay(date, new Date());
              const count = (plan[toDateKey(date)] ?? []).length;
              return <Button key={toDateKey(date)} variant={active ? "default" : "outline"} onClick={() => setSelectedDate(date)} className="h-auto min-w-0 flex-col gap-0.5 px-1.5 py-2 sm:px-3" aria-pressed={active}>
                <span className="text-[10px] font-medium uppercase sm:text-xs">{format(date, "EEE", { locale: ptBR }).replace(".", "")}</span>
                <span className="font-display text-lg font-semibold sm:text-xl">{format(date, "dd")}</span>
                <span className="hidden text-[10px] font-normal sm:block">{format(date, "MMM", { locale: ptBR }).replace(".", "")}{today ? " · hoje" : count ? ` · ${count}` : ""}</span>
              </Button>;
            })}
          </div>
          {emptyWeek && !exampleDismissed && <div className="mt-5 border-y border-line py-5"><p className="font-display font-semibold">Comece com uma semana de exemplo</p><p className="mt-1 text-sm text-steel">Refeições, atividades e descanso editáveis. Você pode limpar a semana a qualquer momento.</p><div className="mt-3 flex gap-2"><Button size="sm" onClick={fillExample}>Preencher com semana de exemplo</Button><Button size="sm" variant="ghost" onClick={() => { localStorage.setItem("trilha:example-dismissed", "yes"); setExampleDismissed(true); }}>Agora não</Button></div></div>}
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <DayTimeline
            dateKey={dateKey}
            adding={adding}
            onAddingChange={setAdding}
            id="linha-do-dia"
            className="scroll-mt-6 lg:col-span-7"
          />

          <aside className="space-y-5 lg:col-span-5">
            <div aria-label="Progresso da semana" className="glass-strong h-auto min-h-fit rounded-2xl p-5 pb-6 ring-1 ring-black/5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold tracking-tight">Progresso da semana</h2>
                 <span className="text-xs text-steel">{formatWeekRange(selectedDate)}</span>
              </div>
              {emptyWeek ? <div className="mt-4"><p className="font-display text-lg font-semibold">Monte sua primeira semana</p><Button variant="outline" size="sm" className="mt-3" onClick={planDay}><Plus />Planejar meu dia</Button></div> : <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/50 p-3 ring-1 ring-black/5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-steel">Rotina</p>
                  <p className={weekStats.pct > 0 ? "mt-1 font-display text-2xl font-semibold" : "mt-1 text-sm text-steel"}>{weekStats.pct > 0 ? `${weekStats.pct}%` : "Conclua seu primeiro item"}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${weekStats.pct}%` }} />
                  </div>
                </div>
                <div className="rounded-xl bg-white/50 p-3 ring-1 ring-black/5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-steel">Treinos</p>
                  <p className={weekStats.treinos > 0 ? "mt-1 font-display text-2xl font-semibold" : "mt-1 text-sm text-steel"}>{weekStats.treinos || "Que tal treinar?"}</p>
                  <p className="mt-1 text-[11px] text-steel">concluídos na semana</p>
                </div>
                <div className="rounded-xl bg-white/50 p-3 ring-1 ring-black/5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-steel">Kcal do dia</p>
                  <p className={resumo.kcal > 0 ? "mt-1 font-display text-2xl font-semibold" : "mt-1 text-sm text-steel"}>{resumo.kcal || "Planeje uma refeição"}</p>
                  <p className="mt-1 break-words pb-1 text-[11px] leading-5 text-steel">estimativa das refeições</p>
                </div>
                <div className="rounded-xl bg-white/50 p-3 ring-1 ring-black/5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-steel">Refeições</p>
                  <p className={weekStats.refeicoes > 0 ? "mt-1 font-display text-2xl font-semibold" : "mt-1 text-sm text-steel"}>{weekStats.refeicoes || "Registre sua refeição"}</p>
                  <p className="mt-1 text-[11px] text-steel">registradas</p>
                </div>
              </div>}
            </div>

            {compras.length > 0 && <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold tracking-tight">Compras da semana</h2>
                <span className="text-sm font-semibold text-ink">{brl(weekStats.semanaCusto)}</span>
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
      </main>
      <AdSlot page="/" slot="home-inline" />
    </>
  );
}
