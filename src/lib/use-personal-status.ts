import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth-context";
import { useTaskBio } from "./trilha-store";
import { getPersonalStatus } from "./social.functions";
import { XP_EVENT } from "./xp-client";
import { brasiliaDay } from "./xp";

/** Only the signed-in owner's XP and existing server-calculated routine streak. */
export function usePersonalStatus() {
  const { user } = useAuth();
  const { plan, habitLog, trackers, finance, modules, ready } = useTaskBio();
  const query = useQuery({
    queryKey: ["personal-status", user?.id, brasiliaDay(new Date())],
    enabled: Boolean(user) && ready,
    queryFn: () => getPersonalStatus(),
    refetchInterval: 30_000,
  });
  const { refetch } = query;
  useEffect(() => {
    if (!user || !ready) return;
    void refetch();
    const refresh = () => { void refetch(); };
    window.addEventListener(XP_EVENT, refresh);
    return () => window.removeEventListener(XP_EVENT, refresh);
  }, [user?.id, ready, plan, habitLog, trackers, finance, modules, refetch]);
  return query.data ?? { todayXp: 0, routineStreak: 0 };
}