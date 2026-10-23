import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const interpretWorkoutPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ text: z.string().trim().min(1).max(40000) }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { data: null, error: "A leitura automática ainda não está configurada." };
    const { interpretPhotoText } = await import("./plan-photo.server");
    return interpretPhotoText(data.text, key);
  });