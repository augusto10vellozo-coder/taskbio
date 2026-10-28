import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brasiliaDay, leaguePositions, leagueWeekStart, rankLeague } from "@/lib/xp";
import { XP_EVENT } from "@/lib/xp-client";
import { needsPersonalLeagueRow } from "@/lib/league-self";

type PersonalLeagueRow = { display_name: string; username: string | null; avatar_url: string | null; week_xp: number; today_xp: number };

export type LeagueMember = { user_id: string; display_name: string; username: string | null; avatar_url: string | null; week_xp: number; total_xp: number; today_xp: number; habit_days: number; first_mark_sec: number; habits: number; meals: number; workouts: number; streak: number; comeback: boolean; week_pct: number | null; streak_rotina: number };

/** Weekly league for the connected group of accepted invites. Ranked by the server-computed weekly completion % — no health data. */
export function useLeague(weekOffset = 0) {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeagueMember[] | null>(null);
  const [unrankedMe, setUnrankedMe] = useState<PersonalLeagueRow | null>(null);
  const load = useCallback(async () => {
    setUnrankedMe(null);
    if (!user) { setRows(null); return; }
    const start = leagueWeekStart(brasiliaDay(new Date(Date.now() + weekOffset * 7 * 86400000)));
    const { data, error } = await supabase.rpc("league_week", { _start: start });
    if (error) { setRows(null); return; }
    const ranked = rankLeague((data ?? []) as LeagueMember[]);
    setRows(ranked);
    if (weekOffset !== 0 || !needsPersonalLeagueRow(ranked, user.id)) return;
    // Owner-scoped reads only; never add this private fallback to ranking/awards inputs.
    const [profile, events] = await Promise.all([
      supabase.from("profiles").select("display_name, username, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("xp_events").select("points, day").eq("user_id", user.id).eq("legacy", false).neq("kind", "saldo_inicial_migracao").gte("day", start).lte("day", brasiliaDay(new Date())),
    ]);
    if (profile.error || events.error || !profile.data) return;
    const today = brasiliaDay(new Date());
    setUnrankedMe({ ...profile.data, week_xp: (events.data ?? []).reduce((n, e) => n + e.points, 0), today_xp: (events.data ?? []).filter((e) => e.day === today).reduce((n, e) => n + e.points, 0) });
  }, [user?.id, weekOffset]);
  useEffect(() => {
    void load();
    const h = () => void load();
    window.addEventListener(XP_EVENT, h);
    return () => window.removeEventListener(XP_EVENT, h);
  }, [load]);
  const myIdx = user && rows ? rows.findIndex((r) => r.user_id === user.id) : -1;
  const position = rows && myIdx >= 0 ? leaguePositions(rows)[myIdx] ?? 0 : 0;
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

  return { rows, position, me, unrankedMe, reload: load };
}
