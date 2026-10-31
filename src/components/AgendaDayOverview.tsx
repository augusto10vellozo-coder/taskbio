import { Flame } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { greeting } from "@/lib/engagement";
import { usePersonalStatus } from "@/lib/use-personal-status";
import { XP_DAILY_CAP } from "@/lib/xp";
import { isMealRecorded } from "@/lib/meal-planning";
import { formatFullDate } from "@/lib/calendar-utils";

/** Greeting with the day's date, shown above the Agenda header. Reads existing values only. */
export function AgendaGreeting() {
  const { user } = useAuth();
  const name = typeof user?.user_metadata?.["display_name"] === "string" && user.user_metadata["display_name"] ? String(user.user_metadata["display_name"]).split(" ")[0] : null;
  return (
    <div className="pt-5">
      <h1 className="text-[22px] font-semibold text-ink">{greeting(new Date().getHours())}{name ? `, ${name}` : ""}</h1>
      <p className="mt-0.5 text-[13px] capitalize text-steel">{formatFullDate(new Date())}</p>
    </div>
  );
}

/** Single-line status strip (streak + XP) and day progress bar, above the timeline. */
export function AgendaDayOverview({ dateKey }: { dateKey: string }) {
  const { plan } = useTaskBio();
  const personal = usePersonalStatus();
  const blocks = plan[dateKey] ?? [];
  const xp = personal.todayXp;
  const days = personal.routineStreak;
  const done = blocks.filter((b) => (b.kind === "refeicao" ? isMealRecorded(b) : b.done)).length;
  const total = blocks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="py-4">
      <div className="flex items-center justify-between gap-3 border-y border-line py-2.5 text-[13px] font-medium">
        <span className="flex items-center gap-1.5">
          <Flame className={days > 0 ? "size-4 text-accent" : "size-4 text-faint"} aria-hidden="true" />
          {days} {days === 1 ? "dia seguido" : "dias seguidos"}
        </span>
        <span className="text-steel">{xp} / {XP_DAILY_CAP} XP hoje</span>
      </div>
      <p className="mt-3 text-xs text-faint">{done} de {total} blocos concluídos</p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do dia">
        <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
