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
