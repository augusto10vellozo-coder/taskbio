import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ACTIVITY_CATALOG, GOALS, type Exercise, type Workout } from "@/lib/trilha-data";
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
  const { workouts, addWorkout, setDoneSets, goal, setGoal } = useTrilha();
  const [selected, setSelected] = useState<string | null>(workouts[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const workout = workouts.find((w) => w.id === selected);

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
              <h2 className="font-display text-lg font-semibold tracking-tight">Modalidades</h2>
              <div className="mt-4 space-y-4">
                {ACTIVITY_CATALOG.map((g) => (
                  <div key={g.group}>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-steel">{g.group}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {g.items.map((i) => (
                        <span
                          key={i}
                          className="rounded-full bg-white/60 px-2.5 py-1 text-[12px] font-medium text-ink ring-1 ring-line"
                        >
                          {i}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5">
              <h2 className="font-display text-lg font-semibold tracking-tight">Meu objetivo</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {GOALS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ${
                      goal === g ? "bg-ink text-white ring-ink" : "bg-white/60 text-steel ring-line hover:text-ink"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="lg:col-span-7 space-y-5">
            <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold tracking-tight">Meus treinos</h2>
                <button
                  onClick={() => setCreating((v) => !v)}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand-deep ring-1 ring-brand/20 hover:bg-brand/5"
                >
                  {creating ? "Cancelar" : "Criar treino"}
                </button>
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

              <div className="mt-4 flex flex-wrap gap-1.5">
                {workouts.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setSelected(w.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ${
                      selected === w.id ? "bg-ink text-white ring-ink" : "bg-white/60 text-steel ring-line"
                    }`}
                  >
                    {w.name}
                  </button>
                ))}
              </div>

              {workout && (
                <div className="mt-4 rail rounded-xl bg-white/50 p-3 pl-4 ring-1 ring-black/5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {workout.name} — {workout.focus}
                    </p>
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand-deep ring-1 ring-brand/15">
                      {workout.modality}
                    </span>
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
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
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
