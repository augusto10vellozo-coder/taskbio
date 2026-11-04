import { Flame } from "lucide-react";
import { HierarchicalBackButton } from "@/components/ModuleHeader";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { greeting } from "@/lib/engagement";
import { usePersonalStatus } from "@/lib/use-personal-status";
import { useTotalXp } from "@/lib/use-total-xp";
import { levelInfo } from "@/lib/level";
import { XP_DAILY_CAP } from "@/lib/xp";
import { isMealRecorded } from "@/lib/meal-planning";
import { formatFullDate } from "@/lib/calendar-utils";

/** Greeting with the day's date, shown above the Agenda header. Reads existing values only. */
export function AgendaGreeting({ showBack = true, date }: { showBack?: boolean; date?: Date }) {
  const { user } = useAuth();
  const name = typeof user?.user_metadata?.["display_name"] === "string" && user.user_metadata["display_name"] ? String(user.user_metadata["display_name"]).split(" ")[0] : null;
  return (
    <div className="pt-5">
      <div className="flex items-center gap-2">{showBack && <HierarchicalBackButton />}<h1 className="min-w-0 text-[22px] font-semibold text-ink">{greeting(new Date().getHours())}{name ? `, ${name}` : ""}</h1></div>
      <p className="mt-0.5 text-[13px] text-steel first-letter:uppercase">{formatFullDate(date ?? new Date())}</p>
    </div>
  );
}

/** Single-line status strip (streak + XP) and day progress bar, above the timeline. */
export function AgendaDayOverview({ dateKey, isToday = true }: { dateKey: string; isToday?: boolean }) {
  const { plan } = useTaskBio();
  const personal = usePersonalStatus();
  const { user } = useAuth();
  const level = levelInfo(useTotalXp()).level;
  const blocks = plan[dateKey] ?? [];
  const xp = personal.todayXp;
  const days = personal.routineStreak;
  const done = blocks.filter((b) => (b.kind === "refeicao" ? isMealRecorded(b) : b.done)).length;
  const total = blocks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="py-4">
      {isToday && (
        <div className="flex items-center justify-between gap-3 border-y border-line py-2.5 text-[13px] font-medium">
          <span className="flex items-center gap-1.5">
            <Flame className={days > 0 ? "size-4 text-accent" : "size-4 text-faint"} aria-hidden="true" />
            {days} {days === 1 ? "dia seguido" : "dias seguidos"}
            {user && <span className="rounded-full bg-mist px-1.5 py-0.5 text-[11px] font-medium text-steel" title={`Nível ${level}`}>Nv {level}</span>}
          </span>
          <span className="text-steel">{xp} / {XP_DAILY_CAP} XP hoje</span>
        </div>
      )}
      <p className="mt-3 text-xs text-faint">{done} de {total} blocos concluídos</p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do dia">
        <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
