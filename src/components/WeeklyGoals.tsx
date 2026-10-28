import { subDays } from "date-fns";
import { useTaskBio } from "@/lib/trilha-store";
import { getWeekDates, toDateKey } from "@/lib/calendar-utils";
import { weeklyGoalProgress } from "@/lib/progress";

/** Weekly goals (moved from Progresso, which is read-only). */
export function WeeklyGoals() {
  const { plan, weeklyGoals, setWeeklyGoals } = useTaskBio();
  const weeklyCount = (dates: Date[]) => {
    const blocks = dates.flatMap((day) => plan[toDateKey(day)] ?? []);
    return [blocks.filter((b) => b.kind === "treino" && b.done).length,
      dates.filter((day) => (plan[toDateKey(day)] ?? []).some((b) => b.kind === "refeicao")).length,
      dates.filter((day) => (plan[toDateKey(day)] ?? []).some((b) => b.kind === "descanso")).length];
  };
  const thisWeek = weeklyCount(getWeekDates(new Date()));
  const lastWeek = weeklyCount(getWeekDates(subDays(new Date(), 7)));
  const rows = (["Treinos realizados", "Dias com refeições planejadas", "Dias de descanso"] as const).map((label, index) => ({ label, value: thisWeek[index] ?? 0, previous: lastWeek[index] ?? 0, target: [weeklyGoals.workouts, weeklyGoals.mealDays, weeklyGoals.restDays][index] ?? 0, key: (["workouts", "mealDays", "restDays"] as const)[index] ?? "workouts" }));
  return (
    <section id="metas-semana" className="mt-7 scroll-mt-24 border-t border-line pt-6" aria-labelledby="weekly-goals-title">
      <div className="mb-4"><h2 id="weekly-goals-title" className="font-display text-xl font-semibold">Metas da semana</h2><p className="text-sm text-steel">Compare com a semana passada e ajuste quando quiser.</p></div>
      <div className="grid gap-5 md:grid-cols-3">{rows.map((row) => { const goal = weeklyGoalProgress(row.value, row.target); return <div key={row.key} className="border-b border-line pb-4"><label className="flex items-center justify-between gap-3 text-sm font-medium"><span>{row.label}</span><input type="number" min="0" max="7" value={row.target} onChange={(event) => setWeeklyGoals({ ...weeklyGoals, [row.key]: Math.min(7, Math.max(0, Number(event.target.value) || 0)) })} className="h-9 w-14 rounded-md bg-background px-2 text-center ring-1 ring-line" aria-label={`Meta de ${row.label.toLowerCase()}`} /></label><p className="mt-3 text-sm">{row.value} de {row.target} · {goal.status}{row.target > 0 && ` · ${goal.percent}%`}</p><div className="relative mt-2 h-2 rounded-full bg-mist" role="progressbar" aria-label={row.label} aria-valuenow={row.value} aria-valuemin={0} aria-valuemax={Math.max(row.target, row.value, 1)}><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, goal.percent)}%` }} />{goal.excess > 0 && <div className="absolute inset-x-0 top-3 h-1 rounded-full bg-mist"><div className="h-full rounded-full bg-good transition-all" style={{ width: `${Math.min(100, goal.percent - 100)}%` }} /></div>}</div><p className="mt-4 text-xs text-steel">Semana anterior: {row.previous} · {row.value > row.previous ? "acima" : row.value < row.previous ? "abaixo" : "igual"}</p></div>; })}</div>
    </section>
  );
}
