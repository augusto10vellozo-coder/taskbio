import { useMemo, useState } from "react";
import { Bell, BookOpen, CalendarClock, Check, Dumbbell, Moon, Pencil, Plus, Trash2, UtensilsCrossed, Wallet, X, type LucideIcon } from "lucide-react";
import { billRemindersOn, brl as brlFinance } from "@/lib/finance";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { KIND_LABEL, brl, type Block, type BlockKind } from "@/lib/trilha-data";
import { useTaskBio } from "@/lib/trilha-store";
import { PhotoBonus } from "@/components/PhotoBonus";
import { mealNutrition } from "@/lib/meal-summary";
import { isMealRecorded, predictedMeal } from "@/lib/meal-planning";
import { usePersonalStatus } from "@/lib/use-personal-status";
import { toast } from "sonner";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { WorkoutSeries, SessionProgress } from "@/components/WorkoutSeries";
import { exerciseSeries } from "@/lib/training-session";
import { RestTimer } from "@/components/RestTimer";

const KIND_ICON: Record<BlockKind, LucideIcon> = {
  treino: Dumbbell,
  refeicao: UtensilsCrossed,
  compromisso: CalendarClock,
  descanso: Moon,
  leitura: BookOpen,
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
  const personal = usePersonalStatus();
  const [undoingMeal, setUndoingMeal] = useState<Block | null>(null);
  const [openWorkout, setOpenWorkout] = useState<string | null>("w1");
  const [editing, setEditing] = useState<Block | null>(null);
  const blocks = plan[dateKey] ?? [];
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
  const doneCount = blocks.filter((b) => (b.kind === "refeicao" ? isMealRecorded(b) : b.done)).length;
  const dayComplete = blocks.length > 0 && doneCount === blocks.length;
  const todayXp = personal.todayXp;

  return (
    <>
      {openWorkout && blocks.some(b => b.workoutId === openWorkout) && <RestTimer />}
      <section id={id} aria-label="Linha do dia" className={className}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">Hoje</h2>
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
          <Link key={bill.id} to="/financas" className="mb-2.5 flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-sm" aria-label={`Conta a pagar: ${bill.title}`}>
            <Wallet className="size-5 shrink-0 text-accent" />
            <span className="min-w-0 flex-1 break-words"><span className="text-[10px] font-medium uppercase tracking-wide text-faint">Conta a pagar · vence amanhã</span><br />{bill.title}</span>
            <span className="shrink-0 font-medium">{brlFinance(bill.amount)}</span>
          </Link>
        ))}

        {blocks.length === 0 && <p className="text-sm text-steel">Nenhum bloco para este dia. Adicione o primeiro.</p>}

        <ol className="relative">
          {blocks.length > 0 && <span aria-hidden="true" className="absolute bottom-5 left-[25px] top-2 w-px bg-line" />}
          {blocks.map((b) => {
            const meal = getMeal(b.mealId);
            const recorded = isMealRecorded(b);
            const completed = b.kind === "refeicao" ? recorded : b.done;
            const nutrition = mealNutrition(recorded ? b : predictedMeal(b), getMeal);
            const workout = getWorkout(b.workoutId);
            const open = workout && openWorkout === workout.id;
            const Icon = KIND_ICON[b.kind];
            const title = b.kind === "refeicao"
              ? `${b.title}${nutrition.known ? ` · ${nutrition.kcal} kcal${nutrition.cost > 0 ? ` · ${brl(nutrition.cost)}` : ""}` : ""}`
              : workout ? `${workout.name} — ${workout.focus}` : (b.manualMeal ? b.title : meal?.items ?? b.title);
            const subtitle = b.kind === "refeicao"
              ? recorded
                ? `${b.plannedMeal || b.mealId ? "Concluído" : "Não planejado"}${b.mealConfirmedAt ? ` · ${new Date(b.mealConfirmedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}`
                : "Planejado"
              : KIND_LABEL[b.kind];
            return (
              <li key={b.id} className="relative flex gap-3 pb-2.5 last:pb-0">
                <span className="w-[52px] shrink-0 pt-4 text-right text-xs font-medium text-faint">{b.time}</span>
                <div className={`min-w-0 flex-1 rounded-2xl border px-4 py-3.5 ${completed ? "border-brand bg-brand-soft" : "border-line bg-card"}`}>
                  <div className="flex items-center gap-3">
                    <Icon className={`size-5 shrink-0 ${completed ? "text-faint" : "text-accent"}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className={`break-words text-[15px] [overflow-wrap:anywhere] ${completed ? "font-medium text-steel" : "font-semibold text-ink"}`}>{title}</p>
                      <p className="text-[13px] text-steel">{subtitle}</p>
                    </div>
                    {b.kind === "leitura" && !b.done
                      ? <Button asChild variant="ghost" size="sm" className="shrink-0 text-accent"><Link to="/leitura" search={{ blockId: b.id, date: dateKey }}><BookOpen className="size-3.5" /> Registrar</Link></Button>
                      : <button
                          type="button"
                          aria-label={`${completed ? "Desmarcar" : "Concluir"} ${b.title}`}
                          aria-pressed={completed}
                          disabled={b.plannedMeal?.state === "pulada"}
                          onClick={() => {
                            if (b.kind !== "refeicao") { toggleBlock(dateKey, b.id); return; }
                            if (recorded) { setUndoingMeal(b); return; }
                            consumeMeal(dateKey, b.id);
                            toast.success(`${b.title} registrado${nutrition.known ? ` · ${nutrition.kcal} kcal` : ""}`);
                          }}
                          className="grid size-11 shrink-0 place-items-center disabled:opacity-50"
                        >
                          <span className={`grid size-6 place-items-center rounded-full ${completed ? "bg-accent text-accent-foreground" : "border-[1.5px] border-line"}`}>
                            {completed && <Check className="size-3.5" aria-hidden="true" />}
                          </span>
                        </button>}
                  </div>

                  {(b.endTime || b.reminderMinutes || b.note) && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-steel">
                      {b.endTime && <span>{b.time} — {b.endTime}</span>}
                      {b.reminderMinutes ? <span className="inline-flex items-center gap-1 text-brand-deep" title={`Lembrete ${b.reminderMinutes} minutos antes`}><Bell className="size-3" /> {b.reminderMinutes} min antes</span> : null}
                      {b.note && <span className="break-words">{b.note}</span>}
                    </p>
                  )}

                  {b.kind === "refeicao" && nutrition.known && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-steel">
                      <span>{nutrition.kcal} kcal</span>
                      <span className="text-line">·</span>
                      <span>P {nutrition.prot}g</span>
                      <span className="text-line">·</span>
                      <span>C {nutrition.carb}g</span>
                      <span className="text-line">·</span>
                      <span>G {nutrition.gord}g</span>
                      {nutrition.cost > 0 && <><span className="text-line">·</span><span className="font-medium text-ink">{brl(nutrition.cost)}</span></>}
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

                  <div className="mt-1.5 flex items-center justify-end gap-1">
                    {b.kind !== "leitura" && <PhotoBonus date={dateKey} block={b} />}
                    <Button variant="ghost" size="icon" onClick={() => setEditing(b)} className="size-8 text-steel" aria-label="Editar bloco" title="Editar">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeBlock(dateKey, b.id)} className="size-8 text-steel hover:text-destructive" aria-label="Remover bloco" title="Remover">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {dayComplete && (
          <div className="mt-2.5 rounded-2xl border border-brand bg-brand-soft p-4">
            <p className="text-[15px] font-semibold text-brand-deep">Dia completo!</p>
            <p className="mt-0.5 text-[13px] text-steel">{doneCount} de {blocks.length} blocos · {todayXp} XP</p>
          </div>
        )}
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
