import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";
import { isMilestone } from "@/lib/engagement";
import { usePersonalStatus } from "@/lib/use-personal-status";
import { AgendaDayOverview, AgendaGreeting } from "@/components/AgendaDayOverview";
import { DayTimeline } from "@/components/DayTimeline";

/** Home: greeting, compact status strip, day progress bar and today's timeline. */
export function TodayPanel() {
  const { ready } = useTaskBio();
  const personal = usePersonalStatus();
  const [now, setNow] = useState<Date | null>(null);
  const [adding, setAdding] = useState(false);
  useEffect(() => setNow(new Date()), []);
  const today = now ? toDateKey(now) : "";
  const days = personal.routineStreak;

  useEffect(() => {
    if (!ready || !now || !isMilestone(days)) return;
    const k = `taskbio:streak-celebrated:${days}:${today}`;
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");
    toast.success(`${days} dias seguidos! Continue assim.`);
  }, [days, ready, now, today]);

  if (!now) return <div className="mt-8 h-40 animate-pulse rounded-lg bg-mist" />;

  return (
    <section>
      <AgendaGreeting />
      <AgendaDayOverview dateKey={today} />
      <DayTimeline dateKey={today} adding={adding} onAddingChange={setAdding} />
    </section>
  );
}

export function Tick({ on }: { on: boolean }) {
  return <span className={`grid size-6 shrink-0 place-items-center rounded-md ring-1 transition-all duration-200 ${on ? "scale-100 bg-brand text-primary-foreground ring-brand" : "ring-line"}`}>{on && <Check className="size-4 animate-in zoom-in-50" />}</span>;
}
