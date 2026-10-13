import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Flame } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";
import { dayScore, greeting, isMilestone, streak } from "@/lib/engagement";
import { MODULES, isModuleOn } from "@/lib/modules";

export function TodayPanel() {
  const { user } = useAuth();
  const { plan, habits, habitLog, modules, toggleBlock, toggleHabit, ready } = useTaskBio();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const today = now ? toDateKey(now) : "";
  const blocks = useMemo(() => [...(plan[today] ?? [])].sort((a, b) => a.time.localeCompare(b.time)), [plan, today]);
  const score = now ? dayScore(plan, habits, habitLog, today) : 0;
  const days = now ? streak(plan, habitLog, now) : 0;
  const habitsOn = isModuleOn(modules, "habitos");

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
        <div className="rounded-lg bg-card p-4 ring-1 ring-line"><p className="text-xs text-steel">Pontuação do dia</p><p className="font-display text-4xl font-semibold">{score}%</p><div className="mt-2 h-1.5 rounded-full bg-mist"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${score}%` }} /></div></div>
        <div className="rounded-lg bg-card p-4 ring-1 ring-line"><p className="text-xs text-steel">Sequência</p><p className="flex items-center gap-1 font-display text-4xl font-semibold"><Flame className={days > 0 ? "size-7 text-brand" : "size-7 text-steel"} />{days}</p><p className="text-xs text-steel">{days === 1 ? "dia seguido" : "dias seguidos"}{isMilestone(days) ? " · marco!" : ""}</p></div>
        <div className="rounded-lg bg-card p-4 ring-1 ring-line">
          <p className="text-xs text-steel">Hoje</p>
          {blocks.length === 0 && (!habitsOn || habits.length === 0) ? <p className="mt-2 text-sm text-steel">Nada planejado para hoje ainda.</p> : (
            <ul className="mt-1 max-h-44 divide-y divide-line overflow-y-auto">
              {blocks.map((b) => <li key={b.id}><button className="flex w-full items-center gap-3 py-2 text-left text-sm" onClick={() => { toggleBlock(today, b.id); if (!b.done) toast.success("Concluído"); }}><Tick on={b.done} /><span className="w-11 text-xs text-steel">{b.time}</span><span className={b.done ? "text-steel line-through" : ""}>{b.title}</span></button></li>)}
              {habitsOn && habits.map((h) => { const on = (habitLog[today] ?? []).includes(h.id); return <li key={h.id}><button className="flex w-full items-center gap-3 py-2 text-left text-sm" onClick={() => { toggleHabit(today, h.id); if (!on) toast.success("Hábito marcado"); }}><Tick on={on} /><span className="w-11 text-xs text-steel">hábito</span><span className={on ? "text-steel line-through" : ""}>{h.name}</span></button></li>; })}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {MODULES.filter((m) => isModuleOn(modules, m.id) && m.id !== "agenda").map((m) => <Link key={m.id} to={m.to} className="flex flex-col items-center gap-1 rounded-lg bg-card p-3 text-center text-[11px] font-medium ring-1 ring-line hover:ring-brand"><m.icon className="size-5 text-brand" />{m.label}</Link>)}
      </div>
    </section>
  );
}

export function Tick({ on }: { on: boolean }) {
  return <span className={`grid size-6 shrink-0 place-items-center rounded-md ring-1 transition-all duration-200 ${on ? "scale-100 bg-brand text-primary-foreground ring-brand" : "ring-line"}`}>{on && <Check className="size-4 animate-in zoom-in-50" />}</span>;
}
