import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota } from "./ai-quota.server";

const reviewInput = z.object({
  criteria: z.string().trim().min(20).max(4000),
  pages: z.array(z.object({
    path: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120),
    content: z.string().trim().min(20).max(12000),
  })).min(1).max(8),
});

export const reviewPublicContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => reviewInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { data: null, error: "Esta área é exclusiva da equipe responsável pelo TaskBio." };

    const chars = data.criteria.length + data.pages.reduce((total, page) => total + page.content.length, 0);
    const quota = await consumeAiQuota(context.supabase, "content_review", chars);
    if (!quota.allowed) return { data: null, error: quota.error };

    const { evaluatePublicContent } = await import("./content-review.server");
    const evaluation = await evaluatePublicContent(data.pages, data.criteria);
    if (!evaluation.data) return evaluation;

    const scores = evaluation.data.scores;
    const { error } = await context.supabase.from("content_reviews").insert({
      created_by: context.userId,
      pages: data.pages,
      criteria: data.criteria,
      result: evaluation.data,
      clarity_score: scores.clarity,
      utility_score: scores.utility,
      suitability_score: scores.suitability,
    });
    if (error) return { data: null, error: "A avaliação foi concluída, mas não pôde ser salva." };
    return evaluation;
  });