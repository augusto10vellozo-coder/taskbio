import { createOpenAI } from "@ai-sdk/openai";

export const OPENAI_MODEL = "gpt-5";

/** Hard ceiling per call. Caps cost and stops a hung request from holding the worker. */
export const OPENAI_MAX_OUTPUT_TOKENS = 4000;
export const OPENAI_TIMEOUT_MS = 90_000;

export function openaiModel(apiKey: string) {
  return createOpenAI({ apiKey }).responses(OPENAI_MODEL);
}

/**
 * Guardrails applied to every generation call: bounded output, no hidden retries
 * (a retry multiplies cost) and a timeout so a stalled request cannot run forever.
 * Returns a fresh AbortSignal, so call it per request.
 */
export function openaiGuard() {
  return {
    maxOutputTokens: OPENAI_MAX_OUTPUT_TOKENS,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
  };
}

/**
 * The AI SDK wraps provider failures in a generic "No output generated" error,
 * so the real reason (no credits, invalid schema, rate limit) lives in `cause`.
 * This walks the chain and returns status plus the innermost message.
 */
export function describeAiError(error: unknown): string {
  const seen = new Set<unknown>();
  let current: unknown = error;
  let fallback = "";
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const detail = current as { message?: string; statusCode?: number; responseBody?: string; cause?: unknown };
    if (!fallback && detail.message) fallback = detail.message;
    if (detail.statusCode || detail.responseBody) {
      const body = detail.responseBody ? ` ${detail.responseBody.slice(0, 300)}` : "";
      return `${detail.statusCode ?? "?"} ${detail.message ?? fallback}${body}`.trim();
    }
    current = detail.cause;
  }
  return fallback || "erro desconhecido";
}
