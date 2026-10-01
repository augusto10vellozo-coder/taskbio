import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BedDouble, CalendarDays, Check, Clock3, Dumbbell, Plus, Utensils, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth-context";
import { formatFullDate, getWeekDates, toDateKey } from "@/lib/calendar-utils";
import type { Block, BlockKind } from "@/lib/trilha-data";
import { useTrilha } from "@/lib/trilha-store";

export const Route = createFileRoute("/rotina")({
  head: () => ({
    meta: [
      { title: "Minha Rotina — Trilha" },
      { name: "description", content: "Organize treino, alimentação e sono em uma rotina diária conectada à sua agenda." },
      { property: "og:title", content: "Minha Rotina — Trilha" },
      { property: "og:description", content: "Sua rotina saudável organizada por horários em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MinhaRotina,
});

type RoutineKind = Extract<BlockKind, "treino" | "refeicao" | "descanso">;

const kindDetails: Record<RoutineKind, { label: string; icon: typeof Dumbbell; color: string; surface: string }> = {
  treino: { label: "Treino", icon: Dumbbell, color: "text-brand-deep", surface: "bg-brand/10 ring-brand/20" },
  refeicao: { label: "Alimentação", icon: Utensils, color: "text-good", surface: "bg-good/10 ring-good/20" },
  descanso: { label: "Sono", icon: BedDouble, color: "text-accent", surface: "bg-accent/10 ring-accent/20" },
};

function minutesBetween(start: string, end?: string) {
  if (!end) return 0;
  const [startHour = 0, startMinute = 0] = start.split(":").map(Number);
  const [endHour = 0, endMinute = 0] = end.split(":").map(Number);
  const startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;
  if (endTotal <= startTotal) endTotal += 24 * 60;
  return endTotal - startTotal;
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
}

function MinhaRotina() {
  const { user, loading } = useAuth();
  const { plan, workouts, meals, addBlock, toggleBlock, removeBlock, getMeal, getWorkout } = useTrilha();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [adding, setAdding] = useState(false);
  const dateKey = toDateKey(selectedDate);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const routineBlocks = useMemo(
    () => (plan[dateKey] ?? [])
      .filter((block) => block.kind === "treino" || block.kind === "refeicao" || block.kind === "descanso")
      .sort((a, b) => a.time.localeCompare(b.time)),
    [dateKey, plan],
  );
  const summary = useMemo(() => ({
    workouts: routineBlocks.filter((block) => block.kind === "treino").length,
    meals: routineBlocks.filter((block) => block.kind === "refeicao").length,
    sleepMinutes: routineBlocks
      .filter((block) => block.kind === "descanso")
      .reduce((total, block) => total + minutesBetween(block.time, block.endTime), 0),
    done: routineBlocks.filter((block) => block.done).length,
  }), [routineBlocks]);

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8"><div className="h-64 animate-pulse rounded-2xl bg-mist" /></main>;

  if (!user) return <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl items-center px-5 py-12 sm:px-8"><section className="w-full border-y border-line py-12"><BedDouble className="size-10 text-brand-deep" /><h1 className="mt-5 font-display text-4xl font-semibold">Sua rotina, no seu ritmo.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-steel">Entre para reunir os horários de treino, alimentação e sono que você planejar.</p><Button asChild className="mt-6"><Link to="/auth">Entrar e organizar</Link></Button></section></main>;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <section className="flex flex-col justify-between gap-5 pt-8 pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Rotina personalizada</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{formatFullDate(selectedDate)}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-steel">Treino, alimentação e sono acompanham o que você adiciona em cada área do aplicativo.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline"><Link to="/"><CalendarDays /> Agenda completa</Link></Button>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" size="icon" aria-label="Escolher data"><CalendarDays /></Button></PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} defaultMonth={selectedDate} locale={ptBR} className="p-3" /></PopoverContent>
          </Popover>
        </div>
      </section>

      <div className="grid grid-cols-7 gap-1.5 pb-6 sm:gap-2">
        {weekDates.map((date) => {
          const active = isSameDay(date, selectedDate);
          const count = (plan[toDateKey(date)] ?? []).filter((block) => block.kind !== "compromisso").length;
          return <Button key={toDateKey(date)} variant={active ? "default" : "outline"} onClick={() => setSelectedDate(date)} className="h-auto min-w-0 flex-col gap-0.5 px-1 py-2" aria-pressed={active}><span className="text-[10px] uppercase sm:text-xs">{format(date, "EEE", { locale: ptBR }).replace(".", "")}</span><span className="font-display text-lg font-semibold">{format(date, "dd")}</span><span className="hidden text-[10px] font-normal sm:block">{count ? `${count} itens` : format(date, "MMM", { locale: ptBR }).replace(".", "")}</span></Button>;
        })}
      </div>

      <section className="grid grid-cols-3 border-y border-line py-5">
        <div className="border-r border-line px-2 sm:px-5"><p className="text-[10px] uppercase text-steel sm:text-xs">Treinos</p><p className="mt-1 font-display text-2xl font-semibold">{summary.workouts}</p></div>
        <div className="border-r border-line px-3 sm:px-5"><p className="text-[10px] uppercase text-steel sm:text-xs">Refeições</p><p className="mt-1 font-display text-2xl font-semibold">{summary.meals}</p></div>
        <div className="px-3 sm:px-5"><p className="text-[10px] uppercase text-steel sm:text-xs">Sono</p><p className="mt-1 font-display text-2xl font-semibold">{summary.sleepMinutes ? durationLabel(summary.sleepMinutes) : "—"}</p></div>
      </section>

      <div className="grid gap-6 pt-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">Horários do dia</h2><p className="mt-1 text-xs text-steel">{summary.done} de {routineBlocks.length} itens concluídos</p></div><Button onClick={() => setAdding((current) => !current)}>{adding ? <X /> : <Plus />}{adding ? "Fechar" : "Adicionar"}</Button></div>
          {adding && <RoutineForm workouts={workouts} meals={meals} onCancel={() => setAdding(false)} onAdd={(block) => { addBlock(dateKey, block); setAdding(false); }} />}
          {routineBlocks.length === 0 ? <div className="mt-6 border-y border-line py-12 text-center"><Clock3 className="mx-auto size-8 text-steel" /><h3 className="mt-3 font-display text-lg font-semibold">Seu dia ainda está livre</h3><p className="mx-auto mt-1 max-w-sm text-sm text-steel">Adicione o primeiro horário de treino, alimentação ou sono.</p><Button className="mt-5" onClick={() => setAdding(true)}><Plus /> Criar primeiro horário</Button></div> : <ol className="relative mt-6 space-y-4 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-line">{routineBlocks.map((block) => {
            const detail = kindDetails[block.kind as RoutineKind];
            const Icon = detail.icon;
            const workout = getWorkout(block.workoutId);
            const meal = getMeal(block.mealId);
            const title = workout ? `${workout.name} — ${workout.focus}` : meal?.items ?? block.title;
            return <li key={block.id} className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-3"><span className={`z-10 grid size-10 place-items-center rounded-full ring-1 ${detail.surface}`}><Icon className={`size-4 ${detail.color}`} /></span><article className="rounded-lg bg-card p-4 ring-1 ring-line"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`text-[10px] font-semibold uppercase ${detail.color}`}>{detail.label}</span><span className="text-xs font-semibold text-steel">{block.time}{block.endTime ? ` — ${block.endTime}` : ""}</span></div><h3 className="mt-1.5 text-sm font-semibold sm:text-base">{title}</h3>{block.note && <p className="mt-1 text-xs text-steel">{block.note}</p>}{block.kind === "descanso" && block.endTime && <p className="mt-1 text-xs text-steel">Duração planejada: {durationLabel(minutesBetween(block.time, block.endTime))}</p>}</div><div className="flex shrink-0 items-center gap-1"><Button variant={block.done ? "secondary" : "outline"} size="sm" onClick={() => toggleBlock(dateKey, block.id)}><Check /> {block.done ? "Concluído" : "Concluir"}</Button><Button variant="ghost" size="icon" onClick={() => removeBlock(dateKey, block.id)} aria-label={`Remover ${title}`} title="Remover"><X /></Button></div></div></article></li>;
          })}</ol>}
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg bg-card p-5 ring-1 ring-line"><h2 className="font-display text-base font-semibold">Tudo conectado</h2><p className="mt-2 text-sm leading-6 text-steel">Treinos criados em Atividades e refeições da Alimentação ficam disponíveis aqui. O que você incluir nesta rotina também aparece na Agenda.</p></div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1"><Button asChild variant="outline" className="justify-start"><Link to="/atividades"><Dumbbell /> Meus treinos</Link></Button><Button asChild variant="outline" className="justify-start"><Link to="/alimentacao"><Utensils /> Alimentação</Link></Button></div>
        </aside>
      </div>
    </main>
  );
}

function RoutineForm({ workouts, meals, onCancel, onAdd }: { workouts: ReturnType<typeof useTrilha>["workouts"]; meals: ReturnType<typeof useTrilha>["meals"]; onCancel: () => void; onAdd: (block: Omit<Block, "id" | "done">) => void }) {
  const [kind, setKind] = useState<RoutineKind>("treino");
  const [time, setTime] = useState("07:00");
  const [endTime, setEndTime] = useState("08:00");
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const selection = kind === "treino" ? workouts.find((item) => item.id === selectedId) : kind === "refeicao" ? meals.find((item) => item.id === selectedId) : undefined;

  return <form className="mt-5 grid gap-4 rounded-lg bg-card p-4 ring-1 ring-line sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const resolvedTitle = kind === "descanso" ? title.trim() || "Sono" : selection ? ("focus" in selection ? selection.name : selection.name) : title.trim(); if (!resolvedTitle) return; onAdd({ time, kind, title: resolvedTitle, ...(endTime ? { endTime } : {}), ...(kind === "treino" && selection ? { workoutId: selection.id } : {}), ...(kind === "refeicao" && selection ? { mealId: selection.id } : {}) }); }}>
    <fieldset className="sm:col-span-2"><legend className="text-xs font-medium text-steel">O que deseja organizar?</legend><div className="mt-2 grid grid-cols-3 gap-2">{(["treino", "refeicao", "descanso"] as const).map((option) => { const detail = kindDetails[option]; const Icon = detail.icon; return <Button key={option} type="button" variant={kind === option ? "default" : "outline"} className="h-auto flex-col py-3" onClick={() => { setKind(option); setSelectedId(""); setTitle(""); }}><Icon />{detail.label}</Button>; })}</div></fieldset>
    <label className="text-xs font-medium text-steel">Início<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required className="mt-1.5 w-full rounded-lg bg-background px-3 py-2 text-sm text-ink ring-1 ring-line" /></label>
    <label className="text-xs font-medium text-steel">Término<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="mt-1.5 w-full rounded-lg bg-background px-3 py-2 text-sm text-ink ring-1 ring-line" /></label>
    {kind === "treino" && workouts.length > 0 && <label className="text-xs font-medium text-steel sm:col-span-2">Escolher dos meus treinos<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1.5 w-full rounded-lg bg-background px-3 py-2 text-sm text-ink ring-1 ring-line"><option value="">Outro treino</option>{workouts.map((workout) => <option key={workout.id} value={workout.id}>{workout.name} — {workout.focus}</option>)}</select></label>}
    {kind === "refeicao" && <label className="text-xs font-medium text-steel sm:col-span-2">Escolher refeição<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1.5 w-full rounded-lg bg-background px-3 py-2 text-sm text-ink ring-1 ring-line"><option value="">Outra refeição</option>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.name} — {meal.items}</option>)}</select></label>}
    {!selection && <label className="text-xs font-medium text-steel sm:col-span-2">{kind === "descanso" ? "Nome deste período" : kind === "treino" ? "Nome do treino" : "Alimento ou refeição"}<input value={title} onChange={(event) => setTitle(event.target.value)} required={kind !== "descanso"} maxLength={100} placeholder={kind === "descanso" ? "Sono" : kind === "treino" ? "Ex.: Corrida leve" : "Ex.: Café da manhã"} className="mt-1.5 w-full rounded-lg bg-background px-3 py-2 text-sm text-ink ring-1 ring-line" /></label>}
    <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button><Button type="submit">Adicionar à rotina</Button></div>
  </form>;
}