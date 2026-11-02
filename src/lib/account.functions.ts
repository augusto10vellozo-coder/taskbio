import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { userRpc } from "./user-rpc";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await userRpc(context.supabase, "delete_my_account");
    if (error) throw new Error("Não foi possível excluir a conta.");
    return { ok: true };
  });
