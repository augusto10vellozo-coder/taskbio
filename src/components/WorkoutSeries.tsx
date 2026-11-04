import { useAuth } from "@/lib/auth-context";
import { startRest, restKey } from "@/lib/rest-timer";
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTaskBio } from '@/lib/trilha-store';
import type { Exercise, Workout } from '@/lib/trilha-data';
import { exerciseSeries, changeSeries, sessionProgress } from '@/lib/training-session';
export function WorkoutSeries({ workout, ex, date }: { workout: Workout; ex: Exercise; date: string }) {
  const { setSeries, plan, toggleBlock } = useTaskBio();
  const { user } = useAuth();
  const timed = Boolean(ex.durationSec && ex.durationSec > 0);
  const block = plan[date]?.find((b) => b.kind === 'treino' && b.workoutId === workout.id);
  const mark = (index: number, done: boolean) => {
    setSeries(workout.id, ex.id, date, index, { done });
    if (!done) return;
    startRest(restKey(user?.id));
    // Uma verdade só: completar a última série marca o dia como feito.
    const next = { ...workout, exercises: workout.exercises.map((e) => e.id === ex.id ? changeSeries(e, date, index, { done: true }) : e) };
    if (block && !block.done && sessionProgress(next, date).complete) toggleBlock(date, block.id);
  };
  return <div className="my-3 flex flex-wrap gap-2">{exerciseSeries(ex, date).map((s, index) => <div key={index} className="flex w-14 flex-col gap-1">
    <Button type="button" variant="outline" aria-label={`${ex.name}: série ${index + 1}`} aria-pressed={s.done} onClick={() => mark(index, !s.done)} className={`size-11 rounded-full ${s.done ? 'bg-good text-primary-foreground border-good hover:bg-good/80' : 'border-line'}`}>{index + 1}</Button>
    {timed
      ? <span className="grid h-9 place-items-center text-[11px] text-steel">{ex.durationSec}s</span>
      : <input aria-label={`${ex.name}: carga da série ${index + 1}`} inputMode="decimal" placeholder={ex.loadKg != null ? String(ex.loadKg) : 'kg'} value={s.loadKg ?? ''} onChange={e => { const value = e.target.value.replace(',', '.'); if (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0)) setSeries(workout.id, ex.id, date, index, { loadKg: value === '' ? undefined : Number(value) }); }} className="h-11 w-full min-w-0 rounded-md bg-card px-1 text-center text-xs ring-1 ring-line" />}
  </div>)}</div>;
}
export function SessionProgress({ workout, date }: { workout: Workout; date: string }) {
  const { plan, toggleBlock } = useTaskBio();
  const p = sessionProgress(workout, date);
  const block = plan[date]?.find(b => b.kind === 'treino' && b.workoutId === workout.id);
  if (!p.total) return null;
  return <div className="mb-3 space-y-2" role="status" aria-live="polite">
    <p className="text-xs font-medium">{p.done} de {p.total} séries · {p.exercises} {p.exercises === 1 ? "exercício concluído" : "exercícios concluídos"}</p>
    <Progress value={100 * p.done / p.total} aria-label="Progresso da sessão" className="[&>div]:bg-good" />
    {p.complete && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-good/10 px-3 py-2 text-sm text-good">
      <span className="font-medium">{block?.done ? "Treino concluído 💪 Dia marcado como feito" : "Treino concluído 💪"}</span>
      {block?.done && <Button size="sm" variant="ghost" className="h-11" onClick={() => toggleBlock(date, block.id)}>Desfazer</Button>}
    </div>}
  </div>;
}
