import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Bell, CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KIND_LABEL, brl, consolidateIngredients, formatIngredientAmount, type Block, type BlockKind } from "@/lib/trilha-data";
import { useTrilha } from "@/lib/trilha-store";
import { useAuth } from "@/lib/auth-context";
import { formatFullDate, formatWeekRange, getWeekDates, toDateKey } from "@/lib/calendar-utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minha Semana — Trilha" },
      {
        name: "description",
        content:
          "Agenda semanal que reúne refeições, treinos, compromissos e descanso em uma única linha do dia, com calorias e custo estimado.",
      },
      { property: "og:title", content: "Minha Semana — Trilha" },
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
  const { plan, getMeal, getWorkout, toggleBlock, removeBlock, addBlock, updateBlock, setDoneSets, goal } =
    useTrilha();
  const [selectedDate, setSelectedDate] = useState(() => {
    if (typeof window === "undefined") return new Date();
    const saved = sessionStorage.getItem("trilha:selected-date");
    if (saved) { sessionStorage.removeItem("trilha:selected-date"); return new Date(`${saved}T12:00:00`); }
    return new Date();
  });
  const [openWorkout, setOpenWorkout] = useState<string | null>("w1");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Block | null>(null);

  const dateKey = toDateKey(selectedDate);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const weekKeys = useMemo(() => weekDates.map(toDateKey), [weekDates]);
  const blocks = plan[dateKey] ?? [];

  const resumo = useMemo(() => {
    const cost = blocks.reduce((sum, b) => sum + (getMeal(b.mealId)?.cost ?? 0), 0);
    const kcal = blocks.reduce((sum, b) => sum + (getMeal(b.mealId)?.macros.kcal ?? 0), 0);
    return { cost, kcal, done: blocks.filter((b) => b.done).length };
  }, [blocks, getMeal]);

  const weekStats = useMemo(() => {
    const all = weekKeys.flatMap((key) => plan[key] ?? []);
    const done = all.filter((b) => b.done).length;
    return {
      pct: all.length ? Math.round((done / all.length) * 100) : 0,
      treinos: all.filter((b) => b.kind === "treino" && b.done).length,
      refeicoes: all.filter((b) => b.kind === "refeicao" && b.done).length,
      semanaCusto: all.reduce((s, b) => s + (getMeal(b.mealId)?.cost ?? 0), 0),
    };
  }, [getMeal, plan, weekKeys]);

  const compras = useMemo(() => consolidateIngredients(
    weekKeys.flatMap((key) => plan[key] ?? []).map((block) => getMeal(block.mealId)).filter((meal) => meal != null),
  ).slice(0, 5), [getMeal, plan, weekKeys]);

  if (loading) {
    return <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8"><div className="h-48 animate-pulse rounded-2xl bg-mist" /></main>;
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl items-center px-5 py-12 sm:px-8">
        <section className="w-full border-y border-line py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.7fr] lg:items-end">
            <div>
              <div className="mb-6 grid size-12 place-items-center rounded-xl bg-ink text-primary-foreground">
                <CalendarDays className="size-6" />
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-deep">Sua rotina começa aqui</p>
              <h1 className="mt-3 max-w-2xl text-balance font-display text-4xl font-semibold sm:text-5xl">
                Abra sua conta e planeje sua semana.
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-steel">
                Organize compromissos, atividades físicas e refeições em um só lugar. Sua agenda começa vazia e é preenchida por você.
              </p>
              <p className="mt-3 text-sm font-medium text-good">Acesso gratuito.</p>
            </div>
            <div className="lg:justify-self-end">
              <Button asChild size="lg"><Link to="/auth">Criar minha conta <ArrowRight /></Link></Button>
              <p className="mt-3 text-xs text-steel">Já tem uma conta? <Link to="/auth" className="font-medium text-brand-deep">Entrar</Link></p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section className="pt-8 pb-4">
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
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="lg:col-span-7">
            <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold tracking-tight">Linha do dia</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdding((v) => !v)}
                  className="text-brand-deep ring-1 ring-brand/20"
                >
                  {adding ? <X /> : <Plus />}{adding ? "Cancelar" : "Adicionar"}
                </Button>
              </div>

              {adding && (
                <AddBlockForm
                  onAdd={(b) => {
                    addBlock(dateKey, b);
                    setAdding(false);
                  }}
                  onCancel={() => setAdding(false)}
                />
              )}

              {blocks.length === 0 && (
                <p className="text-sm text-steel">Nenhum bloco para este dia. Adicione o primeiro.</p>
              )}

              <ol className="relative">
                {blocks.length > 0 && (
                  <span className="absolute left-[7px] top-2 bottom-2 w-px bg-line" />
                )}
                {blocks.map((b) => {
                  const meal = getMeal(b.mealId);
                  const workout = getWorkout(b.workoutId);
                  const open = workout && openWorkout === workout.id;
                  return (
                    <li key={b.id} className="relative pb-5 pl-8">
                      <span
                        className={`absolute left-0 top-1.5 size-4 rounded-full bg-white ring-2 ${dotColor[b.kind]}`}
                      />
                      <div className="flex items-center gap-2 text-xs text-steel">
                        <span className="font-display font-medium text-ink">{b.time}</span>
                        <span className="size-1 rounded-full bg-line" />
                        {KIND_LABEL[b.kind]}
                      </div>

                      <div
                        className={`mt-2 rounded-xl p-3 ring-1 ring-black/5 ${
                          workout ? "rail glass pl-4" : "glass"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">
                            {workout ? `${workout.name} — ${workout.focus}` : (meal?.items ?? b.title)}
                          </p>
                          <div className="flex shrink-0 items-center gap-2">
                            {b.endTime && <span className="text-[11px] text-steel">{b.time} — {b.endTime}</span>}
                             {b.reminderMinutes ? <span title={`Lembrete ${b.reminderMinutes} minutos antes`} className="text-brand-deep"><Bell className="size-3.5" /></span> : null}
                             <button
                              onClick={() => toggleBlock(dateKey, b.id)}
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${
                                b.done
                                  ? "bg-good/10 text-good ring-good/20"
                                  : "text-steel ring-line hover:text-ink"
                              }`}
                            >
                              {b.done ? "Feito" : "Marcar"}
                            </button>
                             <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => setEditing(b)}
                               className="size-7 text-steel"
                               aria-label="Editar bloco"
                               title="Editar"
                             ><Pencil className="size-3.5" /></Button>
                             <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => removeBlock(dateKey, b.id)}
                               className="size-7 text-steel hover:text-destructive"
                              aria-label="Remover bloco"
                               title="Remover"
                            >
                               <Trash2 className="size-3.5" />
                             </Button>
                          </div>
                        </div>

                        {b.note && <p className="mt-1 text-[11px] text-steel">{b.note}</p>}

                        {meal && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-steel">
                            <span>{meal.macros.kcal} kcal</span>
                            <span className="text-line">·</span>
                            <span>P {meal.macros.prot}g</span>
                            <span className="text-line">·</span>
                            <span>C {meal.macros.carb}g</span>
                            <span className="text-line">·</span>
                            <span>G {meal.macros.gord}g</span>
                            <span className="text-line">·</span>
                            <span className="font-medium text-ink">{brl(meal.cost)}</span>
                          </div>
                        )}

                        {workout && (
                          <>
                            <button
                              onClick={() => setOpenWorkout(open ? null : workout.id)}
                              className="mt-2 text-[11px] font-medium text-brand-deep"
                            >
                              {workout.exercises.length} exercícios · {open ? "ocultar" : "ver treino"}
                            </button>
                            {open && (
                              <div className="mt-3 space-y-2.5">
                                {workout.exercises.map((e) => (
                                  <div key={e.id} className="rounded-lg bg-white/50 p-2.5 ring-1 ring-black/5">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-medium">{e.name}</p>
                                      <span className="text-[11px] text-steel">
                                        {e.sets} × {e.reps}
                                        {e.restSec ? ` · descanso ${e.restSec}s` : ""}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-steel">
                                      {e.muscles} — {e.howTo}
                                    </p>
                                    <div className="mt-2 flex items-center gap-1.5">
                                      {Array.from({ length: e.sets }, (_, i) => i + 1).map((n) => (
                                        <button
                                          key={n}
                                          onClick={() =>
                                            setDoneSets(workout.id, e.id, e.doneSets >= n ? n - 1 : n)
                                          }
                                          className={`grid size-5 place-items-center rounded-md text-[10px] font-semibold ${
                                            e.doneSets >= n
                                              ? "bg-good text-white"
                                              : "bg-white text-steel ring-1 ring-line"
                                          }`}
                                        >
                                          {n}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          <aside className="space-y-5 lg:col-span-5">
            <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold tracking-tight">Progresso da semana</h2>
                 <span className="text-xs text-steel">{formatWeekRange(selectedDate)}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/50 p-3 ring-1 ring-black/5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-steel">Rotina</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{weekStats.pct}%</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${weekStats.pct}%` }} />
                  </div>
                </div>
                <div className="rounded-xl bg-white/50 p-3 ring-1 ring-black/5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-steel">Treinos</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{weekStats.treinos}</p>
                  <p className="mt-1 text-[11px] text-steel">concluídos na semana</p>
                </div>
                <div className="rounded-xl bg-white/50 p-3 ring-1 ring-black/5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-steel">Kcal do dia</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{resumo.kcal}</p>
                  <p className="mt-1 text-[11px] text-steel">estimativa das refeições</p>
                </div>
                <div className="rounded-xl bg-white/50 p-3 ring-1 ring-black/5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-steel">Refeições</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{weekStats.refeicoes}</p>
                  <p className="mt-1 text-[11px] text-steel">registradas</p>
                </div>
              </div>
            </div>

            <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5">
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
            </div>
          </aside>
        </div>
      </main>
      {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4" role="dialog" aria-modal="true" aria-label="Editar bloco"><div className="glass-strong w-full max-w-2xl rounded-2xl p-5 shadow-xl ring-1 ring-black/10"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Editar bloco</h2><Button variant="ghost" size="icon" onClick={() => setEditing(null)} aria-label="Fechar"><X /></Button></div><AddBlockForm initial={editing} submitLabel="Salvar alterações" onCancel={() => setEditing(null)} onAdd={(block) => { updateBlock(dateKey, editing.id, block); setEditing(null); }} /></div></div>}
    </>
  );
}

function AddBlockForm({
  onAdd,
  onCancel,
  initial,
  submitLabel = "Salvar",
}: {
  onAdd: (b: Omit<Block, "id" | "done">) => void;
  onCancel: () => void;
  initial?: Block;
  submitLabel?: string;
}) {
  const [time, setTime] = useState(initial?.time ?? "07:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "");
  const [kind, setKind] = useState<BlockKind>(initial?.kind ?? "compromisso");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [reminderMinutes, setReminderMinutes] = useState(initial?.reminderMinutes?.toString() ?? "");
  const [recurrence, setRecurrence] = useState<Block["recurrence"]>(initial?.recurrence ?? "none");
  const [recurrenceUntil, setRecurrenceUntil] = useState(initial?.recurrenceUntil ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd({
          time,
          kind,
          title: title.trim(),
          recurrence: recurrence ?? "none",
          ...(endTime ? { endTime } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(reminderMinutes ? { reminderMinutes: Number(reminderMinutes) } : {}),
           ...(recurrence !== "none" && recurrenceUntil ? { recurrenceUntil } : {}),
          ...(initial?.mealId ? { mealId: initial.mealId } : {}),
          ...(initial?.workoutId ? { workoutId: initial.workoutId } : {}),
        });
        setTitle("");
      }}
      className="mb-5 grid gap-3 rounded-xl bg-white/50 p-4 ring-1 ring-black/5 sm:grid-cols-2"
    >
      <label className="text-xs font-medium text-steel">Início<input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
      /></label>
      <label className="text-xs font-medium text-steel">Término<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="mt-1.5 w-full rounded-lg bg-white px-2 py-1.5 text-sm text-ink ring-1 ring-line" /></label>
      <label className="text-xs font-medium text-steel">Categoria<select
        value={kind}
        onChange={(e) => setKind(e.target.value as BlockKind)}
        className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
      >
        <option value="compromisso">Compromisso</option>
        <option value="refeicao">Refeição</option>
        <option value="treino">Atividade física</option>
        <option value="descanso">Descanso</option>
      </select></label>
      <label className="text-xs font-medium text-steel">Título<input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex.: Consulta, estudo, reunião"
        className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
      /></label>
      <label className="text-xs font-medium text-steel sm:col-span-2">Observações<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Detalhes importantes" className="mt-1.5 w-full rounded-lg bg-white px-2 py-1.5 text-sm text-ink ring-1 ring-line" /></label>
      <label className="text-xs font-medium text-steel">Lembrete<select value={reminderMinutes} onChange={(event) => setReminderMinutes(event.target.value)} className="mt-1.5 w-full rounded-lg bg-white px-2 py-1.5 text-sm text-ink ring-1 ring-line"><option value="">Sem lembrete</option><option value="10">10 minutos antes</option><option value="30">30 minutos antes</option><option value="60">1 hora antes</option></select></label>
      <label className="text-xs font-medium text-steel">Repetição<select disabled={Boolean(initial)} value={recurrence} onChange={(event) => setRecurrence(event.target.value as Block["recurrence"])} className="mt-1.5 w-full rounded-lg bg-white px-2 py-1.5 text-sm text-ink ring-1 ring-line disabled:opacity-60"><option value="none">Não repetir</option><option value="weekdays">Dias úteis</option><option value="daily">Todos os dias</option></select></label>
      {!initial && recurrence !== "none" && <label className="text-xs font-medium text-steel">Repetir até<input type="date" value={recurrenceUntil} onChange={(event) => setRecurrenceUntil(event.target.value)} className="mt-1.5 w-full rounded-lg bg-white px-2 py-1.5 text-sm text-ink ring-1 ring-line" /></label>}
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button><Button type="submit">{submitLabel}</Button></div>
    </form>
  );
}
