import { createOpenAI } from "@ai-sdk/openai";

export const OPENAI_MODEL = "gpt-5";

export function openaiModel(apiKey: string) {
  return createOpenAI({ apiKey }).responses(OPENAI_MODEL);
}
