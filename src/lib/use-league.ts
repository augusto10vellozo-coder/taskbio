import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brasiliaDay, leagueWeekStart, rankLeague } from "@/lib/xp";
import { XP_EVENT } from "@/lib/xp-client";

export type LeagueMember = { user_id: string; display_name: string; username: string | null; avatar_url: string | null; week_xp: number; total_xp: number; today_xp: number; habit_days: number; first_mark_sec: number; habits: number; meals: number; workouts: number; streak: number; comeback: boolean };

/** Weekly league (Sunday–Saturday, Brasília) for me and my accepted friends. Only XP and counts — no health data. */
export function useLeague(weekOffset = 0) {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeagueMember[] | null>(null);
  const load = useCallback(async () => {
    if (!user) { setRows(null); return; }
    const start = leagueWeekStart(brasiliaDay(new Date(Date.now() + weekOffset * 7 * 86400000)));
    const { data } = await supabase.rpc("league_week", { _start: start });
    setRows(rankLeague((data ?? []) as LeagueMember[]));
  }, [user?.id, weekOffset]);
  useEffect(() => {
    void load();
    const h = () => void load();
    window.addEventListener(XP_EVENT, h);
    return () => window.removeEventListener(XP_EVENT, h);
  }, [load]);
  const position = user && rows ? rows.findIndex((r) => r.user_id === user.id) + 1 : 0;
  const me = rows?.find((r) => r.user_id === user?.id) ?? null;

  // Local notice when my position changes (only for the current week, with permission).
  useEffect(() => {
    if (weekOffset !== 0 || !position || !rows || rows.length < 2) return;
    const key = `taskbio:league-pos:${leagueWeekStart(brasiliaDay(new Date()))}`;
    const prev = Number(localStorage.getItem(key) || 0);
    localStorage.setItem(key, String(position));
    if (prev && prev !== position && "Notification" in window && Notification.permission === "granted") {
      new Notification("Sua posição na liga mudou", { body: `Você está em ${position}º entre seus amigos.` });
    }
  }, [position, rows, weekOffset]);

  return { rows, position, me, reload: load };
}
