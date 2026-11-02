import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { brasiliaDay, xpFor } from "@/lib/xp";
import { userRpc } from "./user-rpc";
import { personalTodayXp } from "./personal-status";

const xpInput = z.object({
  kind: z.enum(["habit", "block", "meal", "workout", "photo", "reading", "study", "bill"]),
  ref: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  on: z.boolean(),
  foodItems: z.number().int().min(0).max(100).optional(),
  photoPath: z.string().max(300).optional(),
});

/** Awards or revokes XP. The day and points are decided here, never by the browser. */
export const recordXp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => xpInput.parse(d))
  .handler(async ({ data, context }) => {
    const ref = `${data.kind}:${data.ref}`;
    if (data.kind === "study") {
      const { data: points, error } = await userRpc<number>(context.supabase, "record_my_study_xp", { _session_id: data.ref, _date: data.date, _on: data.on });
      if (error) throw new Error("Não foi possível atualizar os pontos de estudo.");
      return { points: points ?? 0 };
    }
    if (data.kind === "reading") {
      const { data: points, error } = await userRpc<number>(context.supabase, "record_my_reading_xp", { _session_id: data.ref, _date: data.date, _on: data.on });
      if (error) throw new Error("Não foi possível atualizar os pontos da leitura.");
      return { points: points ?? 0 };
    }
    if (data.kind === "habit") {
      const suffix = `:${data.date}`;
      if (!data.ref.endsWith(suffix)) return { points: 0 };
      const habitId = data.ref.slice(0, -suffix.length);
      const { data: points, error } = await userRpc<number>(context.supabase, "record_my_habit_xp", { _habit_id: habitId, _date: data.date, _on: data.on });
      if (error) throw new Error("Não foi possível atualizar os pontos do hábito.");
      return { points: points ?? 0 };
    }
    if (!data.on) {
      const { error } = await userRpc(context.supabase, "revoke_my_xp", { _ref: ref });
      if (error) throw new Error("Não foi possível atualizar os pontos.");
      return { points: 0 };
    }
    const today = brasiliaDay(new Date());
    if (data.kind === "photo" && !data.photoPath?.startsWith(`${context.userId}/`)) return { points: 0 };
    const points = xpFor(data, today);
    if (points === 0) return { points: 0 };
    const { data: granted, error } = await userRpc<number>(context.supabase, "award_my_xp", { _kind: data.kind, _ref: ref, _day: today, _points: points });
    if (error) throw new Error("Não foi possível atualizar os pontos.");
    return { points: granted ?? 0 };
  });

/** Read-only personal status. Identity comes exclusively from the verified session. */
export const getPersonalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = brasiliaDay(new Date());
    const [events, streak] = await Promise.all([
      context.supabase.from("xp_events").select("points, day, legacy, kind").eq("user_id", context.userId).eq("day", today).eq("legacy", false).neq("kind", "saldo_inicial_migracao"),
      userRpc<number>(context.supabase, "routine_streak_me"),
    ]);
    if (events.error || streak.error) throw new Error("Não foi possível carregar sua pontuação.");
    return { todayXp: personalTodayXp(events.data ?? [], today), routineStreak: streak.data ?? 0 };
  });
