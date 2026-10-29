import { useState } from "react";
import { Flame } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { greeting } from "@/lib/engagement";
import { isModuleOn } from "@/lib/modules";
import { useLeague } from "@/lib/use-league";
import { XP_DAILY_CAP } from "@/lib/xp";
import { canMarkHabit } from "@/lib/habits";
import { isMealRecorded } from "@/lib/meal-planning";

/** Greeting, compact XP/streak strip and module counters shown above the Agenda day line. Reads existing values only. */
export function AgendaGreeting() {
  const { user } = useAuth();
  const name = typeof user?.user_metadata?.["display_name"] === "string" && user.user_metadata["display_name"] ? String(user.user_metadata["display_name"]).split(" ")[0] : null;
  return <div className="pt-5"><h1 className="font-display text-2xl font-bold tracking-tight">{greeting(new Date().getHours())}{name ? `, ${name}` : ""}</h1><p className="mt-1 text-sm text-steel">O que importa hoje</p></div>;
}

export function AgendaDayOverview({ dateKey }: { dateKey: string }) {
  const { plan, habits, habitLog, modules } = useTaskBio();
  const league = useLeague();
  const [open, setOpen] = useState(false);
  const blocks = plan[dateKey] ?? [];
  const xp = league.me?.today_xp ?? 0;
  const days = league.me?.streak_rotina ?? 0;
  const meals = blocks.filter((b) => b.kind === "refeicao");
  const workouts = blocks.filter((b) => b.kind === "treino");
  const dueHabits = habits.filter((h) => canMarkHabit(h, habitLog, dateKey));
  const counters = [
    isModuleOn(modules, "alimentacao") && { icon: "🍽️", label: "Refeições", done: meals.filter(isMealRecorded).length, total: meals.length },
    isModuleOn(modules, "treino") && { icon: "🏋️", label: "Treino", done: workouts.filter((b) => b.done).length, total: workouts.length },
    isModuleOn(modules, "habitos") && { icon: "✅", label: "Hábitos", done: dueHabits.filter((h) => habitLog[dateKey]?.includes(h.id)).length, total: dueHabits.length },
  ].filter((c): c is { icon: string; label: string; done: number; total: number } => Boolean(c));

  return (
    <div className="space-y-2.5 py-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-2.5 text-sm ring-1 ring-line">
        <span><span className="font-semibold">{xp} / {XP_DAILY_CAP}</span> <span className="text-steel">XP hoje</span></span>
        <span className="flex items-center gap-1"><Flame className={days > 0 ? "size-4 text-accent" : "size-4 text-steel"} /><span className="font-semibold">{days}</span> <span className="text-steel">{days === 1 ? "dia" : "dias"}</span></span>
      </div>
      {counters.length > 0 && <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Resumo dos módulos de hoje" className="w-full rounded-2xl bg-card px-4 py-2.5 text-left text-sm ring-1 ring-line">
        {open
          ? <ul className="space-y-1">{counters.map((c) => <li key={c.label}>{c.icon} {c.label} {c.total ? `${c.done} de ${c.total}` : "—"}</li>)}</ul>
          : <span className="flex flex-wrap gap-x-2">{counters.map((c, i) => <span key={c.label}>{i > 0 && <span className="mr-2 text-steel">·</span>}{c.icon} {c.total ? `${c.done}/${c.total}` : "—"}</span>)}</span>}
      </button>}
    </div>
  );
}
