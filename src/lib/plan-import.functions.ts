import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota, refundAiQuota } from "./ai-quota.server";

export const interpretWorkoutPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ text: z.string().trim().min(10).max(40000) }).parse(input))
  .handler(async ({ data, context }) => {
    const quota = await consumeAiQuota(context.supabase, "plan_import", data.text.length);
    if (!quota.allowed) return { data: null, error: quota.error };
    const { interpretPlanText } = await import("./plan-import.server");
    const result = await interpretPlanText(data.text);
    if (result.failed) await refundAiQuota(context.supabase, "plan_import");
    return result;
  });
