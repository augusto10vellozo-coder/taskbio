import { useAuth } from "@/lib/auth-context";
import { startRest, restKey } from "@/lib/rest-timer";
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTaskBio } from '@/lib/trilha-store';
import type { Exercise, Workout } from '@/lib/trilha-data';
import { exerciseSeries, sessionProgress } from '@/lib/training-session';
export function WorkoutSeries({ workout, ex, date }: { workout: Workout; ex: Exercise; date: string }) {
  const { setSeries } = useTaskBio();
  const { user } = useAuth();
  const timed = Boolean(ex.durationSec && ex.durationSec > 0);
  return <div className="my-3 flex flex-wrap gap-2">{exerciseSeries(ex, date).map((s, index) => <div key={index} className="flex w-14 flex-col gap-1">
    <Button type="button" variant="outline" aria-label={`${ex.name}: série ${index + 1}`} aria-pressed={s.done} onClick={() => { setSeries(workout.id, ex.id, date, index, { done: !s.done }); if (!s.done) startRest(restKey(user?.id)); }} className={`size-11 rounded-full ${s.done ? 'bg-good text-primary-foreground border-good hover:bg-good/80' : 'border-line'}`}>{index + 1}</Button>
    {timed
      ? <span className="grid h-8 place-items-center text-[11px] text-steel">{ex.durationSec}s</span>
      : <input aria-label={`${ex.name}: carga da série ${index + 1}`} inputMode="decimal" placeholder={ex.loadKg != null ? String(ex.loadKg) : 'kg'} value={s.loadKg ?? ''} onChange={e => { const value = e.target.value.replace(',', '.'); if (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0)) setSeries(workout.id, ex.id, date, index, { loadKg: value === '' ? undefined : Number(value) }); }} className="h-8 w-full min-w-0 rounded-md bg-card px-1 text-center text-xs ring-1 ring-line" />}
  </div>)}</div>;
}
export function SessionProgress({ workout, date }: { workout: Workout; date: string }) {
  const { plan, toggleBlock } = useTaskBio();
  const p = sessionProgress(workout, date);
  const block = plan[date]?.find(b => b.kind === 'treino' && b.workoutId === workout.id);
  if (!p.total) return null;
  return <div className="mb-3 space-y-2" aria-label="Progresso da sessão">
    <p className="text-xs font-medium">{p.done} de {p.total} séries · {p.exercises} exercícios concluídos</p>
    <Progress value={100 * p.done / p.total} className="[&>div]:bg-good" />
    {p.complete && <div className="flex flex-wrap items-center gap-2 text-sm text-good"><span>Treino concluído 💪</span>{block && !block.done && <Button size="sm" variant="outline" onClick={() => toggleBlock(date, block.id)}>Marcar dia como feito</Button>}</div>}
  </div>;
}
