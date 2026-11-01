// Per-user daily AI quota. The database function owns the counter and the limit;
// this module only maps the result to a user-facing message.
//
// The counter is consumed through the caller's own JWT (context.supabase), so no
// service-role key is needed and the client can never write to ai_usage directly.

export type AiFeature = "plan_import" | "plan_photo" | "content_review";

/** Daily call limits per feature. Adjust here to change the product rule. */
export const AI_DAILY_LIMITS: Record<AiFeature, number> = {
  plan_import: 5,
  plan_photo: 5,
  content_review: 20,
};

const FEATURE_LABEL: Record<AiFeature, string> = {
  plan_import: "importações de plano por arquivo",
  plan_photo: "leituras de plano por foto",
  content_review: "avaliações de conteúdo",
};

type QuotaClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export type QuotaResult = { allowed: true } | { allowed: false; error: string };

/**
 * Consumes one unit for the feature before the paid call runs.
 * Fails open only when the quota function is missing, so a pending migration
 * does not take the feature offline.
 */
export async function consumeAiQuota(
  client: unknown,
  feature: AiFeature,
  chars: number,
): Promise<QuotaResult> {
  const limit = AI_DAILY_LIMITS[feature];
  try {
    const { data, error } = await (client as QuotaClient).rpc("consume_ai_quota", {
      _feature: feature,
      _chars: Math.max(0, Math.min(Math.round(chars) || 0, 100_000)),
      _daily_limit: limit,
    });

    if (error) {
      console.error("[ai-quota] unavailable:", error.message);
      return { allowed: true };
    }

    const row = data as { allowed?: boolean } | null;
    if (row?.allowed) return { allowed: true };

    return {
      allowed: false,
      error: `Você atingiu o limite diário de ${limit} ${FEATURE_LABEL[feature]}. Tente novamente amanhã.`,
    };
  } catch (cause) {
    console.error("[ai-quota] failed:", cause);
    return { allowed: true };
  }
}
