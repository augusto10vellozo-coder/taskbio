import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "./auth-context";
import { getHabitFreezes } from "./habit-freezes.functions";

export function useHabitFreezes() {
  const { user } = useAuth();
  const load = useServerFn(getHabitFreezes);
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ["habit-freezes", user?.id], queryFn: () => load(), enabled: !!user, staleTime: 15000, refetchInterval: 60000 });
  useEffect(() => {
    const refresh = () => { void cache.invalidateQueries({ queryKey: ["habit-freezes", user?.id] }); };
    window.addEventListener("taskbio:synced", refresh);
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("taskbio:synced", refresh); window.removeEventListener("focus", refresh); };
  }, [cache, user?.id]);
  return { ...query, signedIn: !!user };
}