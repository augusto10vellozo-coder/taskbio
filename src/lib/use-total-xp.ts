import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";
import { userRpc } from "./user-rpc";
import { XP_EVENT } from "./xp-client";

/** All-time XP of the signed-in user, refetched whenever points change. */
export function useTotalXp() {
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["total-xp", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await userRpc<number>(supabase, "my_total_xp");
      if (error) throw new Error("Não foi possível carregar seu XP total.");
      return Number(data ?? 0);
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!user) return;
    const refresh = () => { void client.invalidateQueries({ queryKey: ["total-xp", user.id] }); };
    window.addEventListener(XP_EVENT, refresh);
    return () => window.removeEventListener(XP_EVENT, refresh);
  }, [client, user?.id]);

  return query.data ?? 0;
}
