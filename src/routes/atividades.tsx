import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, CircleAlert, Dumbbell, History, Pause, Play, Plus, RotateCcw, Sparkles, Timer, Trash2, X } from "lucide-react";
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
import { ACTIVITY_CATALOG, GOALS, OBJECTIVE_EFFECTS, getWorkoutExamples, type Exercise, type Workout } from "@/lib/trilha-data";
import { useTrilha } from "@/lib/trilha-store";

export const Route = createFileRoute("/atividades")({
  head: () => ({
    meta: [
      { title: "Atividades físicas — Trilha" },
      {
        name: "description",
        content:
          "Escolha modalidades de academia, corrida, lutas e mais, monte seus próprios treinos com séries, repetições e descanso.",
      },
      { property: "og:title", content: "Atividades físicas — Trilha" },
      {
        property: "og:description",
        content: "Modalidades, treinos prontos e criação de treino próprio, com séries e descanso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Atividades,
});

function Atividades() {
  const { workouts, workoutHistory, addWorkout, removeWorkout, setDoneSets, setExerciseLoad, completeWorkout, goal, setGoal, preferredModality, setPreferredModality } = useTrilha();
  const [selected, setSelected] = useState<string | null>(workouts[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [runningWorkoutId, setRunningWorkoutId] = useState<string | null>(null);
  const [openExample, setOpenExample] = useState<string | null>(null);
  const workout = workouts.find((w) => w.id === selected);
  const runningWorkout = workouts.find((w) => w.id === runningWorkoutId);
  const examples = preferredModality ? getWorkoutExamples(preferredModality, goal) : [];
  const objectiveEffect = goal ? OBJECTIVE_EFFECTS[goal] : null;

  useEffect(() => {
    if (selected && workouts.some((item) => item.id === selected)) return;
    setSelected(workouts[0]?.id ?? null);
  }, [selected, workouts]);

  const saveExample = (example: Workout) => {
    const created: Workout = {
      ...example,
      id: `w-${Date.now()}`,
      name: `${example.name} (meu treino)`,
      exercises: example.exercises.map((exercise, index) => ({ ...exercise, id: `ex-${Date.now()}-${index}` })),
    };
    addWorkout(created);
    setSelected(created.id);
  };

  return (
    <>
      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section className="pt-8 pb-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Atividades físicas</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Escolha a modalidade ou monte seu treino
          </h1>
          <p className="mt-2 max-w-[52ch] text-pretty text-sm text-steel">
            As sugestões são gerais e não substituem a orientação de um profissional de educação física.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="lg:col-span-5 space-y-5">
            <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5">
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

            <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5">
              <h2 className="font-display text-lg font-semibold tracking-tight">Meu objetivo</h2>
              <p className="mt-1 text-xs text-steel">O objetivo ajusta foco, frequência, intensidade, duração e recuperação dos exemplos.</p>
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
            <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-deep"><Sparkles className="size-4" /></div>
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight">Exemplos para você explorar</h2>
                  <p className="mt-1 text-xs leading-5 text-steel">
                    {preferredModality
                      ? `${preferredModality}${goal ? ` para o objetivo “${goal}”` : ""}.`
                      : "Selecione uma modalidade para começar."}
                  </p>
                </div>
              </div>

              {!preferredModality ? (
                <p className="mt-5 rounded-lg border border-dashed border-line p-4 text-sm text-steel">As opções aparecerão aqui depois que você escolher uma modalidade.</p>
              ) : !goal ? (
                <p className="mt-5 rounded-lg border border-dashed border-line p-4 text-sm text-steel">Agora escolha seu objetivo para ajustar os exemplos. Você também pode explorar a versão geral abaixo.</p>
              ) : null}

              {examples.length > 0 && (
                <div className="mt-4 space-y-3">
                  {examples.map((example, exampleIndex) => {
                    const expanded = openExample === example.id;
                    const approximateMinutes = example.exercises.reduce((total, exercise) => total + exercise.sets * 3, 0);
                    return (
                      <article key={example.id} className="rounded-xl bg-card/70 p-4 ring-1 ring-line">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold">{example.name}</h3>
                              <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-medium text-steel">{exampleIndex === 0 ? "Mais leve" : "Sessão completa"}</span>
                            </div>
                            <p className="mt-1 text-xs text-steel">{example.exercises.length} etapas · cerca de {approximateMinutes} min · {example.focus}</p>
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
                                  <div><p className="font-medium text-ink">{exercise.name} · {exercise.sets} × {exercise.reps}</p><p className="mt-0.5 leading-5 text-steel">{exercise.howTo}</p></div>
                                </li>
                              ))}
                            </ol>
                            <Button className="mt-4 w-full" onClick={() => saveExample(example)}><Plus /> Adicionar aos meus treinos</Button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex items-start gap-2 rounded-lg bg-mist p-3 text-xs leading-5 text-steel">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-brand-deep" />
                <p>Estes são apenas exemplos gerais, não aulas nem prescrição individual. Para segurança, técnica e um plano adequado ao seu corpo, procure um profissional de educação física.</p>
              </div>
            </div>

            <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold tracking-tight">Meus treinos</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreating((v) => !v)}
                >
                  {creating ? "Cancelar" : "Criar treino"}
                </Button>
              </div>

              {creating && (
                <NewWorkoutForm
                  onCreate={(w) => {
                    addWorkout(w);
                    setSelected(w.id);
                    setCreating(false);
                  }}
                />
              )}

              {workouts.length === 0 ? (
                <div className="mt-4 border-y border-dashed border-line py-9 text-center">
                  <Dumbbell className="mx-auto size-7 text-steel" />
                  <p className="mt-2 text-sm font-medium">Você ainda não tem treinos</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-steel">Crie um treino do seu jeito ou adicione uma das sugestões acima.</p>
                  <Button type="button" size="sm" className="mt-4" onClick={() => setCreating(true)}><Plus /> Criar meu primeiro treino</Button>
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
                <div className="mt-4 rail rounded-xl bg-white/50 p-3 pl-4 ring-1 ring-black/5">
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
                      <div key={e.id} className="rounded-lg bg-white/70 p-2.5 ring-1 ring-black/5">
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
                  <Button className="mt-4 w-full" onClick={() => setRunningWorkoutId(workout.id)}>
                    <Play /> Iniciar treino
                  </Button>
                </div>
              )}
            </div>

            <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"><History className="size-4 text-brand-deep" /> Histórico recente</h2>
                <span className="text-xs text-steel">últimas sessões</span>
              </div>
              {workoutHistory.length === 0 ? (
                <p className="mt-4 text-sm text-steel">Conclua seu primeiro treino para acompanhar cargas e evolução.</p>
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
      </main>
      {runningWorkout && (
        <WorkoutRunner
          workout={runningWorkout}
          onClose={() => setRunningWorkoutId(null)}
          onSetDone={setDoneSets}
          onLoadChange={setExerciseLoad}
          onComplete={(durationSec) => {
            const completedExercises = runningWorkout.exercises.filter((exercise) => exercise.doneSets > 0);
            const completedSets = completedExercises.reduce((sum, exercise) => sum + exercise.doneSets, 0);
            completeWorkout({
              id: `history-${Date.now()}`,
              workoutId: runningWorkout.id,
              workoutName: runningWorkout.name,
              completedAt: new Date().toISOString(),
              durationSec,
              completedSets,
              totalVolumeKg: completedExercises.reduce((sum, exercise) => sum + (exercise.loadKg ?? 0) * exercise.reps * exercise.doneSets, 0),
              exercises: completedExercises.map((exercise) => ({
                exerciseId: exercise.id,
                name: exercise.name,
                sets: exercise.doneSets,
                reps: exercise.reps,
                loadKg: exercise.loadKg ?? 0,
              })),
            });
            setRunningWorkoutId(null);
          }}
        />
      )}
    </>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function WorkoutRunner({
  workout,
  onClose,
  onSetDone,
  onLoadChange,
  onComplete,
}: {
  workout: Workout;
  onClose: () => void;
  onSetDone: (workoutId: string, exerciseId: string, doneSets: number) => void;
  onLoadChange: (workoutId: string, exerciseId: string, loadKg: number) => void;
  onComplete: (durationSec: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [restLeft, setRestLeft] = useState(0);

  useEffect(() => {
    if (paused) return;
    const interval = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    if (paused || restLeft <= 0) return;
    const interval = window.setInterval(() => setRestLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [paused, restLeft]);

  const completedSets = workout.exercises.reduce((sum, exercise) => sum + exercise.doneSets, 0);
  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 px-4 py-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Treino em andamento">
      <div className="mx-auto max-w-3xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-background/95 py-3 backdrop-blur">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-deep">Treino em andamento</p>
            <h2 className="font-display text-xl font-semibold">{workout.name} — {workout.focus}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar treino"><X /></Button>
        </header>

        <div className="grid grid-cols-3 gap-2 py-4">
          <div className="rounded-lg bg-card p-3 text-center ring-1 ring-line"><p className="text-[11px] text-steel">Tempo</p><p className="mt-1 font-display text-xl font-semibold tabular-nums">{formatTime(elapsed)}</p></div>
          <div className="rounded-lg bg-card p-3 text-center ring-1 ring-line"><p className="text-[11px] text-steel">Séries</p><p className="mt-1 font-display text-xl font-semibold">{completedSets}/{totalSets}</p></div>
          <div className="rounded-lg bg-card p-3 text-center ring-1 ring-line"><p className="text-[11px] text-steel">Descanso</p><p className="mt-1 font-display text-xl font-semibold tabular-nums">{formatTime(restLeft)}</p></div>
        </div>

        {restLeft > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-brand/10 p-3 text-brand-deep ring-1 ring-brand/20">
            <span className="flex items-center gap-2 text-sm font-medium"><Timer /> Recupere-se para a próxima série</span>
            <Button variant="ghost" size="sm" onClick={() => setRestLeft(0)}>Pular</Button>
          </div>
        )}

        <div className="space-y-3">
          {workout.exercises.map((exercise) => (
            <article key={exercise.id} className="rounded-xl bg-card p-4 ring-1 ring-line">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-base font-semibold">{exercise.name}</h3><p className="mt-1 text-xs leading-5 text-steel">{exercise.muscles} — {exercise.howTo}</p></div>
                <span className="shrink-0 text-xs font-medium text-steel">{exercise.sets} × {exercise.reps}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <label className="text-xs font-medium text-steel">Carga por série (kg)
                  <input type="number" min="0" step="0.5" value={exercise.loadKg ?? ""} onChange={(event) => onLoadChange(workout.id, exercise.id, Math.max(0, Number(event.target.value) || 0))} className="mt-1 block h-9 w-28 rounded-md bg-background px-3 text-sm text-ink ring-1 ring-line focus:outline-none focus:ring-brand" placeholder="0" />
                </label>
                <div className="flex gap-2">
                  {Array.from({ length: exercise.sets }, (_, index) => index + 1).map((setNumber) => {
                    const done = exercise.doneSets >= setNumber;
                    return <Button key={setNumber} type="button" size="icon" variant={done ? "default" : "outline"} aria-label={`Série ${setNumber}${done ? " concluída" : ""}`} onClick={() => { const next = done ? setNumber - 1 : setNumber; onSetDone(workout.id, exercise.id, next); if (!done && exercise.restSec > 0) setRestLeft(exercise.restSec); }}>{done ? <Check /> : setNumber}</Button>;
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>

        <footer className="sticky bottom-0 mt-5 flex items-center justify-between gap-3 border-t border-line bg-background/95 py-4 backdrop-blur">
          <Button variant="outline" onClick={() => setPaused((value) => !value)}>{paused ? <Play /> : <Pause />}{paused ? "Continuar" : "Pausar"}</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setRestLeft(0)} title="Zerar descanso"><RotateCcw /> Descanso</Button>
            <Button onClick={() => onComplete(elapsed)} disabled={completedSets === 0}><Check /> Concluir treino</Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

type Row = { name: string; sets: string; reps: string; rest: string };

function NewWorkoutForm({ onCreate }: { onCreate: (w: Workout) => void }) {
  const [name, setName] = useState("");
  const [focus, setFocus] = useState("");
  const [modality, setModality] = useState("Musculação · Hipertrofia");
  const [rows, setRows] = useState<Row[]>([{ name: "", sets: "4", reps: "10", rest: "60" }]);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const exercises: Exercise[] = rows
          .filter((r) => r.name.trim())
          .map((r, i) => ({
            id: `ex-${Date.now()}-${i}`,
            name: r.name.trim(),
            sets: Math.max(1, Number(r.sets) || 1),
            reps: Math.max(1, Number(r.reps) || 1),
            restSec: Number(r.rest) || 0,
            muscles: "Definido por você",
            howTo: "Execute com técnica e amplitude controladas.",
            doneSets: 0,
          }));
        if (!name.trim() || exercises.length === 0) return;
        onCreate({
          id: `w-${Date.now()}`,
          name: name.trim(),
          focus: focus.trim() || "Treino livre",
          modality,
          exercises,
        });
      }}
      className="mt-4 space-y-2 rounded-xl bg-white/50 p-3 ring-1 ring-black/5"
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome (ex.: Treino D)"
          className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
        />
        <input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Foco (ex.: Ombros)"
          className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
        />
        <input
          value={modality}
          onChange={(e) => setModality(e.target.value)}
          placeholder="Modalidade"
          className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
        />
      </div>

      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_70px_70px_90px]">
          <input
            value={r.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Exercício"
            className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
          />
          <input
            value={r.sets}
            onChange={(e) => update(i, { sets: e.target.value })}
            placeholder="Séries"
            className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
          />
          <input
            value={r.reps}
            onChange={(e) => update(i, { reps: e.target.value })}
            placeholder="Reps"
            className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
          />
          <input
            value={r.rest}
            onChange={(e) => update(i, { rest: e.target.value })}
            placeholder="Descanso s"
            className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
          />
        </div>
      ))}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRows((r) => [...r, { name: "", sets: "3", reps: "12", rest: "45" }])}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-steel ring-1 ring-line hover:text-ink"
        >
          + Exercício
        </button>
        <button className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white ring-1 ring-brand/30">
          Salvar treino
        </button>
      </div>
    </form>
  );
}
