import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Flame } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";
import { dayScore, greeting, isMilestone, streak } from "@/lib/engagement";
import { MODULES, isModuleOn } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { agendaSummary } from "@/lib/agenda-overview";
import { isActiveDay } from "@/lib/engagement";
import { useLeague } from "@/lib/use-league";

export function TodayPanel({ onTodaySelect }: { onTodaySelect: () => void }) {
  const { user } = useAuth();
  const { plan, habits, habitLog, modules, toggleBlock, toggleHabit, ready } = useTaskBio();
  const league = useLeague();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const today = now ? toDateKey(now) : "";
  const blocks = useMemo(() => [...(plan[today] ?? [])].sort((a, b) => a.time.localeCompare(b.time)), [plan, today]);
  const score = now ? dayScore(plan, habits, habitLog, today) : 0;
  const days = now ? streak(plan, habitLog, now, habits) : 0;
  const summary = agendaSummary(blocks);
  const hasStarted = [...Object.keys(plan), ...Object.keys(habitLog)].some((date) => isActiveDay(plan, habitLog, date, habits));
  const habitsOn = isModuleOn(modules, "habitos");
  const workoutToday = isModuleOn(modules, "treino") ? blocks.find((b) => b.kind === "treino") : undefined;

  useEffect(() => {
    if (!ready || !now || !isMilestone(days)) return;
    const k = `taskbio:streak-celebrated:${days}:${today}`;
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");
    toast.success(`${days} dias seguidos! Continue assim.`);
  }, [days, ready, now, today]);

  if (!now) return <div className="mt-8 h-40 animate-pulse rounded-lg bg-mist" />;
  const name = typeof user?.user_metadata?.["display_name"] === "string" && user.user_metadata["display_name"]
    ? String(user.user_metadata["display_name"]).split(" ")[0] : null;

  return (
    <section className="pt-8">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{greeting(now.getHours())}{name ? `, ${name}` : ""}</h2>
      <p className="mt-1 text-sm text-steel">O que importa hoje</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[180px_180px_1fr]">
        <div className="rounded-lg bg-card p-4 ring-1 ring-line"><p className="text-xs text-steel">Pontuação do dia</p>{score > 0 ? <><p className="font-display text-4xl font-semibold">{score}%</p><div className="mt-2 h-1.5 rounded-full bg-mist"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${score}%` }} /></div></> : <p className="mt-2 text-sm text-steel">Conclua um item para dar o primeiro passo hoje.</p>}</div>
        <div className="rounded-lg bg-card p-4 ring-1 ring-line">{hasStarted ? <><p className="text-xs text-steel">Sequência</p><p className="flex items-center gap-1 font-display text-4xl font-semibold"><Flame className={days > 0 ? "size-7 text-brand" : "size-7 text-steel"} />{days}</p><p className="text-xs text-steel">{days === 1 ? "dia seguido" : "dias seguidos"}{isMilestone(days) ? " · marco!" : ""}</p></>}{league.me && <p className="mt-1 text-xs font-medium text-brand-deep">{league.me.today_xp} XP hoje · {league.me.week_xp} XP na semana</p>}{league.rows && league.rows.length > 1 && league.position > 0 && <Link to="/amigos" className="mt-0.5 block text-xs text-steel underline-offset-2 hover:underline">Você está em {league.position}º entre seus amigos</Link>}{false && <></> : <p className="text-sm text-steel">Marque algo hoje para começar sua sequência</p>}</div>
        <div className="rounded-lg bg-card p-4 ring-1 ring-line">
          <p className="text-xs text-steel">Hoje</p>
          <Button variant="ghost" onClick={onTodaySelect} className="mt-1 h-auto w-full justify-start whitespace-normal px-0 py-2 text-left" aria-label="Ir para a Linha do dia de hoje"><span aria-live="polite">{summary.total} {summary.total === 1 ? "item hoje" : "itens hoje"} · {summary.completed} {summary.completed === 1 ? "concluído" : "concluídos"}</span></Button>
        </div>
      </div>
      {workoutToday && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card p-4 ring-1 ring-brand/40">
        <div><p className="text-xs text-steel">Treino de hoje · {workoutToday.time}</p><p className="font-display text-lg font-semibold">{workoutToday.title}</p></div>
        <div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><Link to="/treino">Registrar exercícios</Link></Button><Button size="sm" variant={workoutToday.done ? "outline" : "default"} aria-pressed={workoutToday.done} onClick={() => { toggleBlock(today, workoutToday.id); if (!workoutToday.done) toast.success("Treino concluído!"); }}><Tick on={workoutToday.done} />{workoutToday.done ? "Concluído" : "Concluir treino"}</Button></div>
      </div>}
      {habitsOn && habits.length > 0 && <div className="mt-3"><p className="mb-2 text-xs text-steel">Hábitos de hoje</p><div className="flex flex-wrap gap-2">{habits.map((habit) => { const done = (habitLog[today] ?? []).includes(habit.id); return <Button key={habit.id} variant="outline" size="sm" aria-pressed={done} onClick={() => toggleHabit(today, habit.id)}><Tick on={done} />{habit.name}</Button>; })}</div></div>}
      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {MODULES.filter((m) => isModuleOn(modules, m.id) && m.id !== "agenda").map((m) => <Link key={m.id} to={m.to} className="flex flex-col items-center gap-1 rounded-lg bg-card p-3 text-center text-[11px] font-medium ring-1 ring-line hover:ring-brand"><m.icon className="size-5 text-brand" />{m.label}</Link>)}
      </div>
    </section>
  );
}

export function Tick({ on }: { on: boolean }) {
  return <span className={`grid size-6 shrink-0 place-items-center rounded-md ring-1 transition-all duration-200 ${on ? "scale-100 bg-brand text-primary-foreground ring-brand" : "ring-line"}`}>{on && <Check className="size-4 animate-in zoom-in-50" />}</span>;
}
