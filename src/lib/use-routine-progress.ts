import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";
import { brasiliaDay, leagueWeekStart } from "./xp";

export type RoutineProgress = { pct: number | null; done: number; planned: number };

const shift = (day: string, n: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/** Server-computed routine %. 7 days = current league week (same number as Amigos); 30/90 = last N days. */
export function useRoutineProgress(period: 7 | 30 | 90) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["routine-progress", user?.id, period],
    enabled: Boolean(user),
    queryFn: async (): Promise<RoutineProgress> => {
      const today = brasiliaDay(new Date());
      const start = period === 7 ? leagueWeekStart(today) : shift(today, -(period - 1));
      const end = period === 7 ? shift(start, 6) : today;
      const { data, error } = await supabase.rpc("routine_progress", { _start: start, _end: end, _league_week: period === 7 }).maybeSingle();
      if (error) throw error;
      return { pct: data?.pct == null ? null : Math.round(Number(data.pct) * 100), done: data?.done ?? 0, planned: data?.planned ?? 0 };
    },
  });
}
