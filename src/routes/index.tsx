import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DAYS, KIND_LABEL, brl, type BlockKind, type DayKey } from "@/lib/trilha-data";
import { useTrilha } from "@/lib/trilha-store";

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
  const { plan, getMeal, getWorkout, toggleBlock, removeBlock, addBlock, setDoneSets, goal } =
    useTrilha();
  const [day, setDay] = useState<DayKey>("seg");
  const [openWorkout, setOpenWorkout] = useState<string | null>("w1");
  const [adding, setAdding] = useState(false);

  const blocks = plan[day];
  const dayInfo = DAYS.find((d) => d.key === day) ?? DAYS[0];

  const resumo = useMemo(() => {
    const cost = blocks.reduce((sum, b) => sum + (getMeal(b.mealId)?.cost ?? 0), 0);
    const kcal = blocks.reduce((sum, b) => sum + (getMeal(b.mealId)?.macros.kcal ?? 0), 0);
    return { cost, kcal, done: blocks.filter((b) => b.done).length };
  }, [blocks, getMeal]);

  const weekStats = useMemo(() => {
    const all = DAYS.flatMap((d) => plan[d.key]);
    const done = all.filter((b) => b.done).length;
    return {
      pct: all.length ? Math.round((done / all.length) * 100) : 0,
      treinos: all.filter((b) => b.kind === "treino" && b.done).length,
      refeicoes: all.filter((b) => b.kind === "refeicao" && b.done).length,
      semanaCusto: all.reduce((s, b) => s + (getMeal(b.mealId)?.cost ?? 0), 0),
    };
  }, [plan, getMeal]);

  const compras = useMemo(() => {
    const map = new Map<string, string[]>();
    DAYS.flatMap((d) => plan[d.key]).forEach((b) => {
      getMeal(b.mealId)?.ingredients.forEach((i) => {
        map.set(i.name, [...(map.get(i.name) ?? []), i.qty]);
      });
    });
    return [...map.entries()].slice(0, 5);
  }, [plan, getMeal]);

  return (
    <>
      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section className="pt-8 pb-4">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Minha Semana</p>
              <h1 className="mt-2 max-w-[40ch] text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {dayInfo.long}
              </h1>
              <p className="mt-2 max-w-[48ch] text-pretty text-sm text-steel">
                {blocks.length} blocos planejados · {resumo.done} concluídos · custo do dia estimado em{" "}
                {brl(resumo.cost)}
                {goal ? ` · objetivo: ${goal}` : ""}
              </p>
            </div>
            <div className="glass flex gap-1 overflow-x-auto rounded-xl p-1.5 ring-1 ring-black/5">
              {DAYS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDay(d.key)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
                    d.key === day ? "bg-ink text-white" : "text-steel hover:text-ink"
                  }`}
                >
                  {d.short}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="lg:col-span-7">
            <div className="glass-strong rounded-2xl p-5 ring-1 ring-black/5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold tracking-tight">Linha do dia</h2>
                <button
                  onClick={() => setAdding((v) => !v)}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand-deep ring-1 ring-brand/20 hover:bg-brand/5"
                >
                  {adding ? "Cancelar" : "Adicionar bloco"}
                </button>
              </div>

              {adding && (
                <AddBlockForm
                  onAdd={(b) => {
                    addBlock(day, b);
                    setAdding(false);
                  }}
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
                            <button
                              onClick={() => toggleBlock(day, b.id)}
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${
                                b.done
                                  ? "bg-good/10 text-good ring-good/20"
                                  : "text-steel ring-line hover:text-ink"
                              }`}
                            >
                              {b.done ? "Feito" : "Marcar"}
                            </button>
                            <button
                              onClick={() => removeBlock(day, b.id)}
                              className="text-[11px] text-steel hover:text-ink"
                              aria-label="Remover bloco"
                            >
                              ×
                            </button>
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
                <span className="text-xs text-steel">Semana 24</span>
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
                {compras.map(([name, qtys]) => (
                  <li key={name} className="flex items-center justify-between">
                    <span className="text-steel">{name}</span>
                    <span className="font-medium">{qtys.length}× {qtys[0]}</span>
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
    </>
  );
}

function AddBlockForm({
  onAdd,
}: {
  onAdd: (b: { time: string; kind: BlockKind; title: string; note?: string }) => void;
}) {
  const [time, setTime] = useState("07:00");
  const [kind, setKind] = useState<BlockKind>("compromisso");
  const [title, setTitle] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd({ time, kind, title: title.trim() });
        setTitle("");
      }}
      className="mb-5 grid gap-2 rounded-xl bg-white/50 p-3 ring-1 ring-black/5 sm:grid-cols-[88px_150px_1fr_auto]"
    >
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
      />
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as BlockKind)}
        className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
      >
        <option value="compromisso">Compromisso</option>
        <option value="refeicao">Refeição</option>
        <option value="treino">Atividade física</option>
        <option value="descanso">Descanso</option>
      </select>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex.: Consulta, estudo, reunião"
        className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
      />
      <button className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white ring-1 ring-brand/30">
        Salvar
      </button>
    </form>
  );
}
