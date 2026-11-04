import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";
import { isMilestone } from "@/lib/engagement";
import { usePersonalStatus } from "@/lib/use-personal-status";
import { AgendaDayOverview, AgendaGreeting } from "@/components/AgendaDayOverview";
import { DayTimeline } from "@/components/DayTimeline";
import { Button } from "@/components/ui/button";

/** Home: greeting, day navigation, compact status strip, progress bar and the day timeline. */
export function TodayPanel({ initialDay }: { initialDay?: string | undefined }) {
  const { ready } = useTaskBio();
  const personal = usePersonalStatus();
  const [now, setNow] = useState<Date | null>(null);
  const [adding, setAdding] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => setNow(new Date()), []);
  useEffect(() => { if (initialDay) setDay(initialDay); }, [initialDay]);
  const today = now ? toDateKey(now) : "";
  const dateKey = day ?? today;
  const isToday = dateKey === today;
  const days = personal.routineStreak;

  useEffect(() => {
    if (!ready || !now || !isMilestone(days)) return;
    const k = `taskbio:streak-celebrated:${days}:${today}`;
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");
    toast.success(`${days} dias seguidos! Continue assim.`);
  }, [days, ready, now, today]);

  if (!now) return <div className="mt-8 h-40 animate-pulse rounded-lg bg-mist" />;

  const shift = (delta: number) => setDay(toDateKey(addDays(parseISO(dateKey), delta)));

  return (
    <section>
      <AgendaGreeting date={parseISO(dateKey)} />
      <div className="flex items-center justify-between gap-2 pb-1">
        <Button variant="ghost" size="icon" aria-label="Dia anterior" onClick={() => shift(-1)}><ChevronLeft /></Button>
        {isToday ? (
          <span className="text-xs font-medium uppercase tracking-wide text-steel">Hoje</span>
        ) : (
          <button type="button" onClick={() => setDay(today)} className="text-xs font-medium text-brand-deep underline underline-offset-4">
            Voltar para hoje
          </button>
        )}
        <Button variant="ghost" size="icon" aria-label="Próximo dia" onClick={() => shift(1)}><ChevronRight /></Button>
      </div>
      <AgendaDayOverview dateKey={dateKey} isToday={isToday} />
      <DayTimeline dateKey={dateKey} adding={adding} onAddingChange={setAdding} />
    </section>
  );
}

export function Tick({ on }: { on: boolean }) {
  return <span className={`grid size-6 shrink-0 place-items-center rounded-md ring-1 transition-all duration-200 ${on ? "scale-100 bg-brand text-primary-foreground ring-brand" : "ring-line"}`}>{on && <Check className="size-4 animate-in zoom-in-50" />}</span>;
}
