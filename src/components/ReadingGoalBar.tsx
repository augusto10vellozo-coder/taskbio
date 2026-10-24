import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { useTaskBio } from "@/lib/trilha-store";
import { lastDays } from "@/lib/engagement";
import { isModuleOn } from "@/lib/modules";
import { DEFAULT_READING_GOAL } from "@/lib/reading";
import { brasiliaDay } from "@/lib/xp";

/** Weekly reading minutes vs goal, shown on Minha Agenda when Leitura is on. */
export function ReadingGoalBar() {
  const { trackers, modules } = useTaskBio();
  if (!isModuleOn(modules, "leitura")) return null;
  const goal = trackers.readingGoal ?? DEFAULT_READING_GOAL;
  const week = lastDays(new Date(`${brasiliaDay(new Date())}T12:00:00`), 7);
  const min = (trackers.leitura ?? []).filter((e) => week.includes(e.date)).reduce((n, e) => n + e.minutes, 0);
  return (
    <Link to="/leitura" className="mt-3 block max-w-sm rounded-lg bg-card p-3 ring-1 ring-line">
      <span className="flex items-center justify-between gap-2 text-xs font-medium"><span className="inline-flex items-center gap-1.5"><BookOpen className="size-3.5" /> Leitura da semana</span><span className="text-steel">{min} / {goal} min</span></span>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-mist"><span className="block h-full bg-brand" style={{ width: `${Math.min(100, (min / Math.max(1, goal)) * 100)}%` }} /></span>
    </Link>
  );
}
