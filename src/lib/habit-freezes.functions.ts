import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { freezeStateSchema } from "./habit-freezes";

export const getHabitFreezes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("habit_freeze_state");
    if (error) throw new Error("Não foi possível consultar os congelamentos.");
    return freezeStateSchema.parse(data);
  });

export const acknowledgeHabitFreezes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ ids: z.array(z.string().uuid()).max(500) }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("ack_habit_freezes", { _ids: data.ids });
    if (error) throw new Error("Não foi possível confirmar o aviso.");
    return { ok: true };
  });