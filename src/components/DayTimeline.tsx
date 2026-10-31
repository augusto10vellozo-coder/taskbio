import { useMemo, useState } from "react";
import { Bell, BookOpen, Check, Pencil, Plus, Trash2, Wallet, X } from "lucide-react";
import { billRemindersOn, brl as brlFinance } from "@/lib/finance";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { KIND_LABEL, brl, type Block, type BlockKind } from "@/lib/trilha-data";
import { useTaskBio } from "@/lib/trilha-store";
import { PhotoBonus } from "@/components/PhotoBonus";
import { mealNutrition } from "@/lib/meal-summary";
import { dayMealProgress, isMealRecorded, predictedMeal } from "@/lib/meal-planning";
import { toast } from "sonner";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { WorkoutSeries, SessionProgress } from "@/components/WorkoutSeries";
import { exerciseSeries } from "@/lib/training-session";
import { RestTimer } from "@/components/RestTimer";

const cardColor: Record<BlockKind, string> = {
  treino: "bg-good/10 ring-good/30",
  refeicao: "bg-accent/10 ring-accent/30",
  compromisso: "bg-card ring-line",
  descanso: "bg-card ring-line",
  leitura: "bg-brand/10 ring-brand/30",
};

const dotColor: Record<BlockKind, string> = {
  leitura: "ring-accent",
  refeicao: "ring-good",
  treino: "ring-brand",
  compromisso: "ring-steel",
  descanso: "ring-line",
};

export function DayTimeline({
  dateKey,
  adding,
  onAddingChange,
  id,
  className,
}: {
  dateKey: string;
  adding: boolean;
  onAddingChange: (v: boolean) => void;
  id?: string;
  className?: string;
}) {
  const { plan, getMeal, getWorkout, toggleBlock, removeBlock, addBlock, updateBlock, finance, consumeMeal, undoMeal } = useTaskBio();
  const [undoingMeal, setUndoingMeal] = useState<Block | null>(null);
  const [openWorkout, setOpenWorkout] = useState<string | null>("w1");
  const [editing, setEditing] = useState<Block | null>(null);
  const blocks = plan[dateKey] ?? [];
  const mealProgress = dayMealProgress(blocks);
  const suggestions = useMemo(
    () =>
      Object.values(plan)
        .flat()
        .slice(-100)
        .reduce<string[]>((names, block) => (block.title && !names.includes(block.title) ? [...names, block.title] : names), [])
        .slice(-5)
        .reverse(),
    [plan],
  );

  return (
    <>
      {openWorkout && blocks.some(b => b.workoutId === openWorkout) && <RestTimer />}
      <section id={id} aria-label="Linha do dia" className={className}>
        <div className="glass-strong rounded-3xl p-5 ring-1 ring-line sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div><h2 className="font-display text-lg font-semibold tracking-tight">Linha do dia</h2><p className="mt-1 text-xs text-steel">Refeições: {mealProgress.completed} de {mealProgress.total}</p></div>
            <Button variant="ghost" size="sm" onClick={() => onAddingChange(!adding)} className="text-brand-deep ring-1 ring-brand/20">
              {adding ? <X /> : <Plus />}{adding ? "Cancelar" : "Adicionar"}
            </Button>
          </div>

          {adding && (
            <AddBlockForm
              suggestions={suggestions}
              onAdd={(b) => {
                addBlock(dateKey, b);
                onAddingChange(false);
              }}
              onCancel={() => onAddingChange(false)}
            />
          )}

          {billRemindersOn(finance?.bills ?? [], dateKey).map((bill) => (
            <Link key={bill.id} to="/financas" className="mb-4 flex items-center gap-3 rounded-2xl border-l-4 border-accent/60 bg-card px-4 py-3 text-sm ring-1 ring-line" aria-label={`Conta a pagar: ${bill.title}`}>
              <Wallet className="size-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 break-words"><span className="text-[10px] font-medium uppercase tracking-wide text-steel">Conta a pagar · vence amanhã</span><br />{bill.title}</span>
              <span className="shrink-0 font-medium">{brlFinance(bill.amount)}</span>
            </Link>
          ))}

          {blocks.length === 0 && <p className="text-sm text-steel">Nenhum bloco para este dia. Adicione o primeiro.</p>}

          <ol className="relative">
            {blocks.length > 0 && <span className="absolute left-[7px] top-2 bottom-2 w-px bg-line" />}
            {blocks.map((b) => {
              const meal = getMeal(b.mealId);
              const recorded = isMealRecorded(b);
              const completed = b.kind === "refeicao" ? recorded : b.done;
              const nutrition = mealNutrition(recorded ? b : predictedMeal(b), getMeal);
              const workout = getWorkout(b.workoutId);
              const open = workout && openWorkout === workout.id;
              return (
                <li key={b.id} className="relative pb-7 pl-8">
                  <span className={`absolute left-0 top-1.5 size-4 rounded-full bg-card ring-2 ${dotColor[b.kind]}`} />
                  <div className="flex items-center gap-2 text-xs text-steel">
                    <span className="font-display font-medium text-ink">{b.time}</span>
                    <span className="size-1 rounded-full bg-line" />
                    {KIND_LABEL[b.kind]}
                    {b.kind === "leitura" && <BookOpen className="size-3.5 text-accent" />}
                  </div>

                  <div className={`mt-2 min-h-[4.5rem] rounded-2xl p-4 ring-1 transition-opacity ${cardColor[b.kind]} ${completed ? "opacity-70" : ""}`}>
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0"><p className={`break-words text-sm [overflow-wrap:anywhere] ${completed ? "font-normal" : "font-semibold"}`}>{completed && <Check className="mr-1 inline size-4 text-good" aria-hidden="true" />}{b.kind === "refeicao" ? `${b.title}${nutrition.known ? ` · ${nutrition.kcal} kcal${nutrition.cost > 0 ? ` · ${brl(nutrition.cost)}` : ""}` : ""}` : workout ? `${workout.name} — ${workout.focus}` : (b.manualMeal ? b.title : meal?.items ?? b.title)}</p>{b.kind === "refeicao" && <p className={`mt-1 text-[11px] ${recorded ? "text-good" : "text-steel"}`}>{recorded ? b.plannedMeal || b.mealId ? "Concluído" : "Não planejado" : "Planejado"}{recorded && b.mealConfirmedAt ? ` · ${new Date(b.mealConfirmedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>}</div>
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">
                        {b.endTime && <span className="text-[11px] text-steel">{b.time} — {b.endTime}</span>}
                        {b.reminderMinutes ? <span title={`Lembrete ${b.reminderMinutes} minutos antes`} className="text-brand-deep"><Bell className="size-3.5" /></span> : null}
                        {b.kind === "leitura" && !b.done ? <Button asChild variant="ghost" size="sm" className="text-accent"><Link to="/leitura" search={{ blockId: b.id, date: dateKey }}><BookOpen className="size-3.5" /> Registrar</Link></Button> : <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${completed ? "Desmarcar" : "Concluir"} ${b.title}`}
                          aria-pressed={completed}
                          disabled={b.plannedMeal?.state === "pulada"}
                          onClick={() => {
                            if (b.kind !== "refeicao") { toggleBlock(dateKey, b.id); return; }
                            if (recorded) { setUndoingMeal(b); return; }
                            consumeMeal(dateKey, b.id);
                            toast.success(`${b.title} registrado${nutrition.known ? ` · ${nutrition.kcal} kcal` : ""}`);
                          }}
                          className={`h-auto rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${
                            completed ? "bg-good/10 text-good ring-good/20" : "text-steel ring-line hover:text-ink"
                          }`}
                        >
                          {completed && <Check className="size-3.5" />}{completed ? "Feito" : "Concluir"}
                        </Button>}
                        {b.kind !== "leitura" && <PhotoBonus date={dateKey} block={b} />}
                        <Button variant="ghost" size="icon" onClick={() => setEditing(b)} className="size-7 text-steel" aria-label="Editar bloco" title="Editar">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeBlock(dateKey, b.id)} className="size-7 text-steel hover:text-destructive" aria-label="Remover bloco" title="Remover">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    {b.note && <p className="mt-1 text-[11px] text-steel">{b.note}</p>}

                    {b.kind === "refeicao" && nutrition.known && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-steel">
                        <span>{nutrition.kcal} kcal</span>
                        <span className="text-line">·</span>
                        <span>P {nutrition.prot}g</span>
                        <span className="text-line">·</span>
                        <span>C {nutrition.carb}g</span>
                        <span className="text-line">·</span>
                        <span>G {nutrition.gord}g</span>
                        <span className="text-line">·</span>
                        {nutrition.cost > 0 && <span className="font-medium text-ink">{brl(nutrition.cost)}</span>}
                      </div>
                    )}

                    {workout && (
                      <>
                        <button onClick={() => setOpenWorkout(open ? null : workout.id)} className="mt-2 text-[11px] font-medium text-brand-deep">
                          {workout.exercises.length} exercícios · {open ? "ocultar" : "ver treino"}
                        </button>
                        {open && (
                          <div className="mt-3 space-y-2.5 pb-32">
                            <SessionProgress workout={workout} date={dateKey} />
                            {workout.exercises.map((e) => (
                              <div key={e.id} className="rounded-lg bg-card/50 p-2.5 ring-1 ring-line">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium">{e.name}</p>
                                  <span className="text-[11px] text-steel">
                                    {exerciseSeries(e, dateKey).filter(s => s.done).length} de {e.sets} séries · {e.sets} × {e.reps}
                                    {e.restSec ? ` · descanso ${e.restSec}s` : ""}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] text-steel">
                                  {e.muscles} — {e.howTo}
                                </p>
                                <WorkoutSeries workout={workout} ex={e} date={dateKey} />
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

      <AlertDialog open={!!undoingMeal} onOpenChange={open => { if (!open) setUndoingMeal(null); }}>
        <AlertDialogContent className="w-[calc(100%-2rem)]">
          <AlertDialogHeader><AlertDialogTitle>Desmarcar refeição?</AlertDialogTitle><AlertDialogDescription>Desmarcar este {undoingMeal?.title.toLocaleLowerCase("pt-BR")} vai remover o registro alimentar do dia</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (!undoingMeal) return; undoMeal(dateKey, undoingMeal.id); toast.success("Registro alimentar removido"); setUndoingMeal(null); }}>Desmarcar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4" role="dialog" aria-modal="true" aria-label="Editar bloco">
          <div className="glass-strong w-full max-w-2xl rounded-2xl p-5 shadow-xl ring-1 ring-line">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Editar bloco</h2>
              <Button variant="ghost" size="icon" onClick={() => setEditing(null)} aria-label="Fechar">
                <X />
              </Button>
            </div>
            <AddBlockForm
              initial={editing}
              submitLabel="Salvar alterações"
              onCancel={() => setEditing(null)}
              onAdd={(block) => {
                updateBlock(dateKey, editing.id, block);
                setEditing(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function AddBlockForm({
  onAdd,
  onCancel,
  initial,
  submitLabel = "Salvar",
  suggestions = [],
}: {
  onAdd: (b: Omit<Block, "id" | "done">) => void;
  onCancel: () => void;
  initial?: Block;
  submitLabel?: string;
  suggestions?: string[];
}) {
  const { trackers } = useTaskBio();
  const [readingBookId, setReadingBookId] = useState(initial?.readingBookId ?? "");
  const [durationMinutes, setDurationMinutes] = useState(initial?.durationMinutes?.toString() ?? "30");
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
          ...(kind === "leitura" ? { readingBookId, durationMinutes: Number(durationMinutes) } : {}),
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
      className="mb-5 grid gap-3 rounded-xl bg-card/50 p-4 ring-1 ring-line sm:grid-cols-2"
    >
      {suggestions.length > 0 && !initial && <div className="flex flex-wrap gap-1.5 sm:col-span-2">{suggestions.map((name) => <Button type="button" variant="outline" size="sm" key={name} onClick={() => setTitle(name)}>{name}</Button>)}</div>}
      <label className="text-xs font-medium text-steel">Início<input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="rounded-lg bg-card px-2 py-1.5 text-sm ring-1 ring-line"
      /></label>
      <label className="text-xs font-medium text-steel">Término<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="mt-1.5 w-full rounded-lg bg-card px-2 py-1.5 text-sm text-ink ring-1 ring-line" /></label>
      <label className="text-xs font-medium text-steel">Categoria<select
        value={kind}
        onChange={(e) => setKind(e.target.value as BlockKind)}
        className="rounded-lg bg-card px-2 py-1.5 text-sm ring-1 ring-line"
      >
        <option value="compromisso">Compromisso</option>
        <option value="refeicao">Refeição</option>
        <option value="treino">Atividade física</option>
        <option value="descanso">Descanso</option>
        <option value="leitura">Leitura</option>
      </select></label>
      {kind === "leitura" && <><label className="text-xs font-medium text-steel">Duração (min)<input required type="number" min="1" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} className="mt-1.5 w-full rounded-lg bg-background px-2 py-1.5 text-sm ring-1 ring-line" /></label><label className="text-xs font-medium text-steel">Livro (opcional)<select value={readingBookId} onChange={e => setReadingBookId(e.target.value)} className="mt-1.5 w-full rounded-lg bg-background px-2 py-1.5 text-sm ring-1 ring-line"><option value="">Sem livro vinculado</option>{(trackers.books ?? []).map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label></>}
      <label className="text-xs font-medium text-steel">Título<input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex.: Consulta, estudo, reunião"
        className="rounded-lg bg-card px-2 py-1.5 text-sm ring-1 ring-line"
      /></label>
      <label className="text-xs font-medium text-steel sm:col-span-2">Observações<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Detalhes importantes" className="mt-1.5 w-full rounded-lg bg-card px-2 py-1.5 text-sm text-ink ring-1 ring-line" /></label>
      <label className="text-xs font-medium text-steel">Lembrete<select value={reminderMinutes} onChange={(event) => setReminderMinutes(event.target.value)} className="mt-1.5 w-full rounded-lg bg-card px-2 py-1.5 text-sm text-ink ring-1 ring-line"><option value="">Sem lembrete</option><option value="10">10 minutos antes</option><option value="30">30 minutos antes</option><option value="60">1 hora antes</option></select></label>
      <label className="text-xs font-medium text-steel">Repetição<select disabled={Boolean(initial)} value={recurrence} onChange={(event) => setRecurrence(event.target.value as Block["recurrence"])} className="mt-1.5 w-full rounded-lg bg-card px-2 py-1.5 text-sm text-ink ring-1 ring-line disabled:opacity-60"><option value="none">Não repetir</option><option value="weekdays">Dias úteis</option><option value="daily">Todos os dias</option></select></label>
      {!initial && recurrence !== "none" && <label className="text-xs font-medium text-steel">Repetir até<input type="date" value={recurrenceUntil} onChange={(event) => setRecurrenceUntil(event.target.value)} className="mt-1.5 w-full rounded-lg bg-card px-2 py-1.5 text-sm text-ink ring-1 ring-line" /></label>}
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button><Button type="submit">{submitLabel}</Button></div>
    </form>
  );
}
