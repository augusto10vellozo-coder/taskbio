import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { freezesLeft, monthlyBadges } from "@/lib/xp";

export type Awards = { wins: string[]; freezeDays: string[]; freezes: number; badges: string[] };
type Raw = { won: boolean; week_start: string; frozen_day: string | null; wins: string[]; freeze_days: string[] };

const listeners = new Set<(a: Awards) => void>();
let cache: { uid: string; at: number; data: Awards } | null = null;
let inflight: Promise<void> | null = null;

/** Uses the existing notification channel: toast in the app plus a system notice when permitted. */
export function notify(title: string, body: string) {
  toast.success(title, { description: body });
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try { new Notification(title, { body }); } catch { /* some browsers only allow via service worker */ }
  }
}

function load(uid: string) {
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase.rpc("claim_league_awards");
    const r = data as unknown as Raw | null;
    if (!r) return;
    const a: Awards = { wins: r.wins, freezeDays: r.freeze_days, freezes: freezesLeft(r.wins.length, r.freeze_days.length), badges: monthlyBadges(r.wins) };
    if (r.won) notify("Você venceu a liga da semana! 🏆", "Ganhou o troféu de campeão e 1 congelamento de sequência.");
    if (r.frozen_day) {
      const d = r.frozen_day.split("-").reverse().slice(0, 2).join("/");
      notify("Congelamento aplicado", `Você não marcou nada em ${d}, então usamos 1 congelamento e sua sequência continua.`);
    }
    const month = r.week_start.slice(0, 7);
    if (r.won && r.wins.filter((w) => w.slice(0, 7) === month).length === 3) {
      notify("Nova insígnia mensal", "3 vitórias no mesmo mês — o emblema está no seu perfil.");
    }
    cache = { uid, at: Date.now(), data: a };
    listeners.forEach((l) => l(a));
  })().finally(() => { inflight = null; });
  return inflight;
}

/** Weekly wins, available streak freezes and monthly badges for the signed-in person. */
export function useAwards() {
  const { user } = useAuth();
  const [awards, setAwards] = useState<Awards | null>(cache && cache.uid === user?.id ? cache.data : null);
  useEffect(() => {
    if (!user) { setAwards(null); return; }
    listeners.add(setAwards);
    if (cache?.uid === user.id && Date.now() - cache.at < 10 * 60 * 1000) setAwards(cache.data);
    else void load(user.id);
    return () => { listeners.delete(setAwards); };
  }, [user?.id]);
  return awards;
}
