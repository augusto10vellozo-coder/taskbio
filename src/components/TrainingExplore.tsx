import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useEntryState } from "@/lib/navigation-context";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { toDateKey } from "@/lib/calendar-utils";
import type { Block } from "@/lib/trilha-data";
import { CalendarPlus, ChevronDown, ChevronUp, Dumbbell, History, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ACTIVITY_CATALOG, GOALS, OBJECTIVE_EFFECTS, exercisePrescription, getWorkoutExamples, type Workout } from "@/lib/trilha-data";
import { findWorkoutBlock, largestFreeGap, withWorkoutBlock, workoutTimeFor } from "@/lib/training-schedule";
import { useTaskBio } from "@/lib/trilha-store";


export type ScheduleResult = { ok: true; block: Block } | { ok: false; existing: Block };

/**
 * Hook shared by both tabs: schedules a copy of a model so week edits never
 * change the model. A day that already has a workout is user data, so it is
 * never overwritten without `replace`: the caller must ask first.
 */
export function useScheduleWorkout() {
  const { plan, workouts, addWorkout, removeWorkout, replaceDays } = useTaskBio();
  return (dateKey: string, model: Workout, options?: { replace?: boolean }): ScheduleResult => {
    const existing = findWorkoutBlock(dateKey, plan);
    if (existing && !options?.replace) return { ok: false, existing };
    const id = `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const copy: Workout = { ...model, id, templateId: model.templateId ?? model.id, exercises: model.exercises.map((e, i) => ({ ...e, id: `${id}-e${i}`, doneSets: 0, seriesByDate: {} })) };
    addWorkout(copy);
    const block: Block = { id: `b-${Date.now()}-${dateKey}`, time: workoutTimeFor(dateKey, plan, existing), kind: "treino", title: copy.name, done: false, workoutId: copy.id };
    replaceDays({ [dateKey]: withWorkoutBlock(plan[dateKey] ?? [], block, existing?.id) });
    // A cópia substituída era só um agendamento; o modelo em "Meus treinos" permanece.
    const replaced = existing?.workoutId ? workouts.find((item) => item.id === existing.workoutId) : undefined;
    if (replaced?.templateId) removeWorkout(replaced.id);
    return { ok: true, block };
  };
}

function DayPicker({ workout, onScheduled }: { workout: Workout; onScheduled?: (day: Date) => void }) {
  const schedule = useScheduleWorkout();
  const [pending, setPending] = useState<{ dateKey: string; day: Date } | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  const run = (dateKey: string, day: Date, replace: boolean) => {
    const result = schedule(dateKey, workout, { replace });
    if (!result.ok) { setPending({ dateKey, day }); return; }
    setPending(null);
    toast.success(`${workout.name} agendado para ${format(day, "EEEE, d/MM", { locale: ptBR })} às ${result.block.time}`);
    onScheduled?.(day);
  };
  return <>
    <div className="flex flex-wrap gap-1.5">{days.map((d) => <Button key={toDateKey(d)} type="button" size="sm" variant="secondary" className="h-8 capitalize" onClick={() => run(toDateKey(d), d, false)}>{i18nDay(d)}</Button>)}</div>
    {pending && <div role="alertdialog" aria-label="Substituir treino" className="mt-2 rounded-lg bg-gold/10 p-3 text-xs ring-1 ring-gold/30">
      <p className="font-medium capitalize">{format(pending.day, "EEEE, d/MM", { locale: ptBR })} já tem um treino.</p>
      <p className="mt-1 text-steel">Substituir apaga o treino atual e o progresso das séries desse dia.</p>
      <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => run(pending.dateKey, pending.day, true)}>Substituir</Button><Button size="sm" variant="ghost" onClick={() => setPending(null)}>Cancelar</Button></div>
    </div>}
  </>;
}

function ScheduleButton({ workout, label = "Agendar na semana" }: { workout: Workout; label?: string }) {
  const [open, setOpen] = useState(false);
  return <div className="mt-3">
    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setOpen((v) => !v)}><CalendarPlus /> {label}</Button>
    {open && <div className="mt-2"><DayPicker workout={workout} onScheduled={() => setOpen(false)} /></div>}
  </div>;
}
const i18nDay = (d: Date) => format(d, "EEE d", { locale: ptBR });

export function TrainingExplore() {
  const { workouts: allWorkouts, workoutHistory, addWorkout, removeWorkout, goal, setGoal, preferredModality, setPreferredModality, plan } = useTaskBio();
  const workouts = allWorkouts.filter((w) => !w.templateId);
  const [selected, setSelected] = useEntryState<string | null>("training:model", workouts[0]?.id ?? null);
  const navigate = useNavigate();
  const [openExample, setOpenExample] = useEntryState<string | null>("training:example", null);
  const [pendingExample, setPendingExample] = useState<{ model: Workout; exampleId: string } | null>(null);
  const [pendingBlank, setPendingBlank] = useState<Workout | null>(null);
  const workout = workouts.find((w) => w.id === selected);
  const modality = preferredModality ?? "Musculação";
  const examples = getWorkoutExamples(modality, goal);
  const [day] = useEntryState<string | null>("training:day", null);
  const freeMinutes = day && (plan[day]?.length ?? 0) > 0 ? largestFreeGap(plan[day] ?? []) : 0;
  const objectiveEffect = goal ? OBJECTIVE_EFFECTS[goal] : null;

  useEffect(() => {
    if (selected && workouts.some((item) => item.id === selected)) return;
    setSelected(workouts[0]?.id ?? null);
  }, [selected, workouts.length]);

  const saveExample = (example: Workout) => {
    const created: Workout = {
      ...example,
      id: `w-${Date.now()}`,
      name: `${example.name} (meu treino)`,
      exercises: example.exercises.map((exercise, index) => ({ ...exercise, id: `ex-${Date.now()}-${index}` })),
    };
    addWorkout(created);
    setSelected(created.id);
    setPendingExample({ model: created, exampleId: example.id });
  };

  /** Creates the model and asks for a day: the editor only exists on a scheduled day. */
  const createBlank = () => {
    const created: Workout = {
      id: `w-${Date.now()}`,
      name: "Novo treino",
      focus: "Treino livre",
      modality: preferredModality || "Academia",
      exercises: [],
    };
    addWorkout(created);
    setSelected(created.id);
    setPendingBlank(created);
    toast.success("Treino criado em Meus treinos. Escolha um dia para adicionar os exercícios.");
  };

  return (
    <>
      <div>
        <p className="mb-4 max-w-[52ch] text-pretty text-sm text-steel">Escolha a modalidade e monte seu treino.</p>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="lg:col-span-5 space-y-5">
            <div className="glass-strong rounded-2xl p-5 ring-1 ring-line">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold tracking-tight">Modalidades</h2>
                {preferredModality && <span className="text-xs font-medium text-brand-deep">{preferredModality}</span>}
              </div>
              <p className="mt-1 text-xs text-steel">Escolha uma opção para ver exemplos relacionados.</p>
              <div className="mt-4 space-y-4">
                {ACTIVITY_CATALOG.map((g) => (
                  <div key={g.group}>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-steel">{g.group}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {g.items.map((i) => (
                        <Button
                          key={i}
                          type="button"
                          size="sm"
                          variant={preferredModality === i ? "default" : "outline"}
                          aria-pressed={preferredModality === i}
                          onClick={() => {
                            setPreferredModality(i);
                            setOpenExample(null);
                          }}
                          className="h-7 rounded-full px-2.5 text-[12px]"
                        >{i}</Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-strong rounded-2xl p-5 ring-1 ring-line">
              <h2 className="font-display text-lg font-semibold tracking-tight">Meu objetivo</h2>
              <p className="mt-1 text-xs text-steel">Seu objetivo deixa os exemplos com a sua cara.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {GOALS.map((g) => (
                  <Button
                    key={g}
                    type="button"
                    size="sm"
                    variant={goal === g ? "default" : "outline"}
                    aria-pressed={goal === g}
                    onClick={() => setGoal(g)}
                    className="h-7 rounded-full px-2.5 text-[12px]"
                  >
                    {g}
                  </Button>
                ))}
              </div>
              {objectiveEffect && (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-xs">
                  <div className="col-span-2"><dt className="text-steel">Foco</dt><dd className="mt-0.5 font-medium text-ink">{objectiveEffect.focus}</dd></div>
                  <div><dt className="text-steel">Frequência sugerida</dt><dd className="mt-0.5 font-medium text-ink">{objectiveEffect.frequency}</dd></div>
                  <div><dt className="text-steel">Intensidade</dt><dd className="mt-0.5 font-medium text-ink">{objectiveEffect.intensity}</dd></div>
                  <div><dt className="text-steel">Duração</dt><dd className="mt-0.5 font-medium text-ink">{objectiveEffect.duration}</dd></div>
                  <div><dt className="text-steel">Recuperação</dt><dd className="mt-0.5 font-medium text-ink">{objectiveEffect.recovery}</dd></div>
                </dl>
              )}
            </div>
          </section>

          <section className="lg:col-span-7 space-y-5">
            <div className="glass-strong rounded-2xl p-5 ring-1 ring-line">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-deep"><Sparkles className="size-4" /></div>
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight">Exemplos para você explorar</h2>
                  <p className="mt-1 text-xs leading-5 text-steel">
                    {modality}{goal ? ` para o objetivo “${goal}”` : ""}.{!preferredModality ? " Escolha outra modalidade ao lado para ver mais." : ""}
                  </p>
                </div>
              </div>

              {examples.length > 0 && (
                <div className="mt-4 space-y-3">
                  {examples.map((example, exampleIndex) => {
                    const expanded = openExample === example.id;
                    const approximateMinutes = example.exercises.reduce((total, exercise) => total + exercise.sets * 3, 0);
                    const fits = freeMinutes > 0 && approximateMinutes <= freeMinutes;
                    return (
                      <article key={example.id} className="rounded-xl bg-card/70 p-4 ring-1 ring-line">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold">{example.name}</h3>
                              <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-medium text-steel">{exampleIndex === 0 ? "Mais leve" : "Sessão completa"}</span>
                            </div>
                            <p className="mt-1 text-xs text-steel">{example.exercises.length} etapas · cerca de {approximateMinutes} min · {example.focus}{fits ? " · cabe no seu dia" : ""}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setOpenExample(expanded ? null : example.id)}>
                            {expanded ? <ChevronUp /> : <ChevronDown />}{expanded ? "Recolher" : "Ver exemplo"}
                          </Button>
                        </div>
                        {expanded && (
                          <div className="mt-4 border-t border-line pt-4">
                            <ol className="space-y-2">
                              {example.exercises.map((exercise, index) => (
                                <li key={exercise.id} className="flex items-start gap-3 text-xs">
                                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-mist font-semibold text-steel">{index + 1}</span>
                                  <div><p className="font-medium text-ink">{exercise.name} · {exercisePrescription(exercise)}</p><p className="mt-0.5 leading-5 text-steel">{exercise.howTo}</p></div>
                                </li>
                              ))}
                            </ol>
                            {pendingExample?.exampleId === example.id ? <div className="mt-4 rounded-lg bg-mist p-3">
                              <p className="text-sm font-medium">Modelo salvo em “Meus treinos”. Agendar para qual dia?</p>
                              <p className="mt-1 text-xs text-steel">O editor abre no dia escolhido, pronto para adicionar exercícios.</p>
                              <div className="mt-2"><DayPicker workout={pendingExample.model} onScheduled={(day) => { setPendingExample(null); void navigate({ to: "/treino", search: { dia: toDateKey(day) } }); }} /></div>
                              <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => setPendingExample(null)}>Agora não</Button>
                            </div> : <div className="mt-4 grid gap-2 sm:grid-cols-2"><Button onClick={() => saveExample(example)}><Plus /> Usar este modelo</Button><ScheduleButton workout={example} /></div>}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}

            </div>

            <div className="glass-strong rounded-2xl p-5 ring-1 ring-line">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold tracking-tight">Meus treinos</h2>
                <Button type="button" variant="outline" size="sm" onClick={createBlank}>
                  <Plus /> Criar do zero
                </Button>
              </div>

              {workouts.length === 0 ? (
                <div className="mt-4 border-y border-dashed border-line py-9 text-center">
                  <Dumbbell className="mx-auto size-7 text-steel" />
                  <p className="mt-2 text-sm font-medium">Você ainda não tem treinos</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-steel">Crie um treino do seu jeito ou adicione uma das sugestões acima.</p>
                  <Button type="button" size="sm" className="mt-4" onClick={createBlank}><Plus /> Criar meu primeiro treino</Button>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {workouts.map((w) => (
                    <Button
                      type="button"
                      size="sm"
                      variant={selected === w.id ? "default" : "outline"}
                      key={w.id}
                      onClick={() => setSelected(w.id)}
                    >
                      {w.name}
                    </Button>
                  ))}
                </div>
              )}

              {workout && (
                <div className="mt-4 rail rounded-xl bg-card/50 p-3 pl-4 ring-1 ring-line">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">
                      {workout.name} — {workout.focus}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand-deep ring-1 ring-brand/15">
                        {workout.modality}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive" aria-label={`Excluir ${workout.name}`} title="Excluir treino"><Trash2 /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir {workout.name}?</AlertDialogTitle>
                            <AlertDialogDescription>Este treino será removido de “Meus treinos”. O histórico das sessões já concluídas será mantido.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => removeWorkout(workout.id)}>Excluir treino</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {workout.exercises.map((e) => (
                      <div key={e.id} className="rounded-lg bg-card/70 p-2.5 ring-1 ring-line">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{e.name}</p>
                          <span className="text-[11px] text-steel">
                            {exercisePrescription(e)}
                            {e.restSec ? ` · descanso ${e.restSec}s` : ""}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-steel">
                          {e.muscles} — {e.howTo}
                        </p>
                      </div>
                    ))}
                  </div>
                  <ScheduleButton workout={workout} />
                  {pendingBlank?.id === workout.id && <div className="mt-2 rounded-lg bg-mist p-3">
                    <p className="text-sm font-medium">Agendar para qual dia?</p>
                    <p className="mt-1 text-xs text-steel">Os exercícios são adicionados no dia escolhido.</p>
                    <div className="mt-2"><DayPicker workout={workout} onScheduled={(day) => { setPendingBlank(null); void navigate({ to: "/treino", search: { dia: toDateKey(day) } }); }} /></div>
                  </div>}
                  <p className="mt-2 text-[11px] text-steel">Este é um modelo. A cópia agendada pode ser ajustada em “Minha semana” sem alterar o modelo.</p>
                </div>
              )}
            </div>

            <div className="glass-strong rounded-2xl p-5 ring-1 ring-line">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"><History className="size-4 text-brand-deep" /> Histórico recente</h2>
                <span className="text-xs text-steel">últimas sessões</span>
              </div>
              {workoutHistory.length === 0 ? (
                <p className="mt-4 text-sm text-steel">Conclua seu primeiro treino pra ver a evolução aqui.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {workoutHistory.slice(0, 5).map((entry) => (
                    <article key={entry.id} className="flex items-center justify-between gap-4 rounded-lg bg-card/70 p-3 ring-1 ring-line">
                      <div>
                        <p className="text-sm font-medium">{entry.workoutName}</p>
                        <p className="mt-0.5 text-[11px] text-steel">{new Date(entry.completedAt).toLocaleDateString("pt-BR")} · {entry.completedSets} séries</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{entry.totalVolumeKg.toLocaleString("pt-BR")} kg</p>
                        <p className="text-[11px] text-steel">{formatTime(entry.durationSec)}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
