import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const interpretWorkoutPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ text: z.string().trim().min(10).max(40000) }).parse(input))
  .handler(async ({ data }) => {
    const { interpretPlanText } = await import("./plan-import.server");
    return interpretPlanText(data.text);
  });
