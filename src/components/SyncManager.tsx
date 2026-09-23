import { useEffect, useRef, useState } from "react";
import { Cloud, CloudOff } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useTrilha, type TrilhaState } from "@/lib/trilha-store";

type SyncStatus = "idle" | "loading" | "saved" | "error";

export function SyncManager() {
  const { user, loading: authLoading } = useAuth();
  const { plan, workouts, meals, goal, ready, hydrate } = useTrilha();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const initializedUser = useRef<string | null>(null);
  const skipNextPush = useRef(false);

  useEffect(() => {
    if (authLoading || !ready || !user) {
      initializedUser.current = null;
      return;
    }

    let active = true;
    setStatus("loading");
    supabase.from("user_data").select("plan, workouts, meals, settings").eq("user_id", user.id).maybeSingle().then(async ({ data, error }) => {
      if (!active) return;
      if (error) {
        setStatus("error");
        return;
      }

      if (data) {
        const settings = data.settings && typeof data.settings === "object" && !Array.isArray(data.settings)
          ? data.settings as Record<string, unknown>
          : {};
        skipNextPush.current = true;
        hydrate({
          plan: data.plan as unknown as TrilhaState["plan"],
          workouts: data.workouts as unknown as TrilhaState["workouts"],
          meals: data.meals as unknown as TrilhaState["meals"],
          goal: typeof settings["goal"] === "string" ? settings["goal"] : null,
        });
      } else {
        const { error: insertError } = await supabase.from("user_data").insert({
          user_id: user.id,
          plan: plan as unknown as Json,
          workouts: workouts as unknown as Json,
          meals: meals as unknown as Json,
          settings: { goal },
        });
        if (insertError) {
          setStatus("error");
          return;
        }
      }
      initializedUser.current = user.id;
      setStatus("saved");
    });

    return () => { active = false; };
  }, [authLoading, ready, user?.id]);

  useEffect(() => {
    if (!user || initializedUser.current !== user.id) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    setStatus("loading");
    const timer = window.setTimeout(async () => {
      const { error } = await supabase.from("user_data").upsert({
        user_id: user.id,
        plan: plan as unknown as Json,
        workouts: workouts as unknown as Json,
        meals: meals as unknown as Json,
        settings: { goal },
        updated_at: new Date().toISOString(),
      });
      setStatus(error ? "error" : "saved");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [goal, meals, plan, user, workouts]);

  if (!user || status === "idle") return null;
  return <div className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-[11px] font-medium text-steel shadow-sm ring-1 ring-line backdrop-blur" role="status">
    {status === "error" ? <CloudOff className="size-3.5 text-destructive" /> : <Cloud className="size-3.5 text-good" />}
    {status === "loading" ? "Sincronizando" : status === "error" ? "Sem sincronização" : "Salvo na nuvem"}
  </div>;
}