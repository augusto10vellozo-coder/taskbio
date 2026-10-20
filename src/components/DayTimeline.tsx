import { useMemo, useState } from "react";
import { Bell, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KIND_LABEL, brl, type Block, type BlockKind } from "@/lib/trilha-data";
import { useTaskBio } from "@/lib/trilha-store";
import { PhotoBonus } from "@/components/PhotoBonus";
import { mealNutrition } from "@/lib/meal-summary";

const dotColor: Record<BlockKind, string> = {
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
  const { plan, getMeal, getWorkout, toggleBlock, removeBlock, addBlock, updateBlock, setDoneSets } = useTaskBio();
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

  return (
    <>
      <section id={id} aria-label="Linha do dia" className={className}>
        <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight">Linha do dia</h2>
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

          {blocks.length === 0 && <p className="text-sm text-steel">Nenhum bloco para este dia. Adicione o primeiro.</p>}

          <ol className="relative">
            {blocks.length > 0 && <span className="absolute left-[7px] top-2 bottom-2 w-px bg-line" />}
            {blocks.map((b) => {
              const meal = getMeal(b.mealId);
              const nutrition = mealNutrition(b, getMeal);
              const workout = getWorkout(b.workoutId);
              const open = workout && openWorkout === workout.id;
              return (
                <li key={b.id} className="relative pb-5 pl-8">
                  <span className={`absolute left-0 top-1.5 size-4 rounded-full bg-white ring-2 ${dotColor[b.kind]}`} />
                  <div className="flex items-center gap-2 text-xs text-steel">
                    <span className="font-display font-medium text-ink">{b.time}</span>
                    <span className="size-1 rounded-full bg-line" />
                    {KIND_LABEL[b.kind]}
                  </div>

                  <div className={`mt-2 rounded-xl p-3 ring-1 ring-black/5 ${workout ? "rail glass pl-4" : "glass"}`}>
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <p className="min-w-0 break-words text-sm font-medium [overflow-wrap:anywhere]">{workout ? `${workout.name} — ${workout.focus}` : (b.manualMeal ? b.title : meal?.items ?? b.title)}</p>
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">
                        {b.endTime && <span className="text-[11px] text-steel">{b.time} — {b.endTime}</span>}
                        {b.reminderMinutes ? <span title={`Lembrete ${b.reminderMinutes} minutos antes`} className="text-brand-deep"><Bell className="size-3.5" /></span> : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${b.done ? "Desmarcar" : "Concluir"} ${b.title}`}
                          aria-pressed={b.done}
                          onClick={() => toggleBlock(dateKey, b.id)}
                          className={`h-auto rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${
                            b.done ? "bg-good/10 text-good ring-good/20" : "text-steel ring-line hover:text-ink"
                          }`}
                        >
                          {b.done ? "Feito" : "Marcar"}
                        </Button>
                        <PhotoBonus date={dateKey} block={b} />
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
                                      onClick={() => setDoneSets(workout.id, e.id, e.doneSets >= n ? n - 1 : n)}
                                      className={`grid size-5 place-items-center rounded-md text-[10px] font-semibold ${
                                        e.doneSets >= n ? "bg-good text-white" : "bg-white text-steel ring-1 ring-line"
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

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4" role="dialog" aria-modal="true" aria-label="Editar bloco">
          <div className="glass-strong w-full max-w-2xl rounded-2xl p-5 shadow-xl ring-1 ring-black/10">
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
      {suggestions.length > 0 && !initial && <div className="flex flex-wrap gap-1.5 sm:col-span-2">{suggestions.map((name) => <Button type="button" variant="outline" size="sm" key={name} onClick={() => setTitle(name)}>{name}</Button>)}</div>}
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
