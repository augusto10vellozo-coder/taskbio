import { streamText } from "ai";
import { openaiGuard, openaiModel } from "./openai.server";

type ReviewPage = { path: string; title: string; content: string };

export type ContentReviewResult = {
  summary: string;
  scores: { clarity: number; utility: number; suitability: number };
  strengths: string[];
  improvements: Array<{ priority: "alta" | "média" | "baixa"; page: string; action: string; reason: string }>;
  risks: string[];
};

function parseReview(text: string): ContentReviewResult {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned) as ContentReviewResult;
  const score = (value: number) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return {
    summary: String(parsed.summary ?? ""),
    scores: {
      clarity: score(parsed.scores?.clarity),
      utility: score(parsed.scores?.utility),
      suitability: score(parsed.scores?.suitability),
    },
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 6) : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 10).map((item) => ({
      priority: item.priority === "alta" || item.priority === "baixa" ? item.priority : "média",
      page: String(item.page ?? "Geral"),
      action: String(item.action ?? ""),
      reason: String(item.reason ?? ""),
    })) : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks.map(String).slice(0, 6) : [],
  };
}

export async function evaluatePublicContent(pages: ReviewPage[], criteria: string) {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) return { data: null, error: "A avaliação por IA ainda não está configurada." };

  try {
    const result = streamText({
      model: openaiModel(apiKey),
      system: "Você é um revisor editorial brasileiro especializado em conteúdo público de bem-estar. Avalie sem oferecer diagnóstico, prescrição ou aconselhamento jurídico. Responda somente com JSON válido, sem markdown.",
      prompt: `Avalie as páginas públicas do TaskBio segundo os critérios informados. Dê notas inteiras de 0 a 100. As melhorias devem ser específicas, acionáveis e priorizadas.\n\nCRITÉRIOS:\n${criteria}\n\nPÁGINAS:\n${JSON.stringify(pages)}\n\nFormato obrigatório: {"summary":"...","scores":{"clarity":0,"utility":0,"suitability":0},"strengths":["..."],"improvements":[{"priority":"alta|média|baixa","page":"/caminho","action":"...","reason":"..."}],"risks":["..."]}`,
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
      ...openaiGuard(),
    });
    const text = await result.text;
    if (!text.trim()) return { data: null, error: "A avaliação terminou sem conteúdo. Tente novamente mais tarde." };
    return { data: parseReview(text), error: null };
  } catch (error) {
    const detail = error as { statusCode?: number; responseBody?: string; message?: string };
    let message = "Não foi possível concluir a avaliação agora.";
    try {
      const body = detail.responseBody ? JSON.parse(detail.responseBody) as { message?: string; error?: { message?: string } } : null;
      message = body?.message ?? body?.error?.message ?? detail.message ?? message;
    } catch { message = detail.message ?? message; }
    return { data: null, error: message };
  }
}