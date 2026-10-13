import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createGatewayFetch } from "./ai-run-id.server";
import type { ImportedWorkout } from "./training";

const DAYS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const;

function parse(text: string): { readable: boolean; workouts: ImportedWorkout[] } {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  const raw = JSON.parse(cleaned) as { readable?: boolean; workouts?: unknown[] };
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
  const workouts = (Array.isArray(raw.workouts) ? raw.workouts : []).slice(0, 14).map((w) => {
    const item = w as { day?: string; name?: string; exercises?: unknown[] };
    return {
      day: (DAYS as readonly string[]).includes(String(item.day)) ? (item.day as ImportedWorkout["day"]) : null,
      name: String(item.name ?? "Treino").slice(0, 80),
      exercises: (Array.isArray(item.exercises) ? item.exercises : []).slice(0, 30).map((e) => {
        const ex = e as { name?: string; sets?: unknown; reps?: unknown; loadKg?: unknown };
        const load = num(ex.loadKg);
        return { name: String(ex.name ?? "").slice(0, 80), sets: Math.max(1, Math.round(num(ex.sets)) || 3), reps: Math.max(1, Math.round(num(ex.reps)) || 10), loadKg: load > 0 ? load : null };
      }).filter((e) => e.name.trim()),
    };
  }).filter((w) => w.exercises.length > 0);
  return { readable: raw.readable !== false && workouts.length > 0, workouts };
}

export async function interpretPlanText(text: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { data: null, error: "A leitura automática ainda não está configurada." };
  const gateway = createGatewayFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: gateway.fetch,
  });
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: "Você converte planos de treino em português (texto corrido, tabelas, abreviações como 3x10, '3 séries de 10 reps a 40kg') em JSON estruturado. Não invente exercícios nem cargas que não estejam no texto. Responda somente com JSON válido, sem markdown.",
      prompt: `Formato obrigatório: {"readable":true,"workouts":[{"day":"seg|ter|qua|qui|sex|sab|dom|null","name":"Peito e tríceps","exercises":[{"name":"Supino reto","sets":3,"reps":10,"loadKg":40}]}]}\nUse "day": null quando o dia não for informado, e "loadKg": null quando a carga não aparecer. Para faixas de repetições (8-12) use o menor valor. Se o texto não contiver um plano de treino, retorne {"readable":false,"workouts":[]}.\n\nTEXTO DO ARQUIVO:\n${text}`,
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
    });
    const out = await result.text;
    if (!out.trim()) return { data: null, error: "A leitura terminou sem conteúdo. Tente novamente." };
    return { data: parse(out), error: null };
  } catch (error) {
    const detail = error as { statusCode?: number; responseBody?: string; message?: string };
    let message = "Não foi possível interpretar o arquivo agora.";
    try {
      const body = detail.responseBody ? (JSON.parse(detail.responseBody) as { message?: string; error?: { message?: string } }) : null;
      message = body?.message ?? body?.error?.message ?? message;
    } catch { /* mantém mensagem padrão */ }
    if (error instanceof SyntaxError) message = "Não foi possível entender o plano deste arquivo. Cadastre os treinos manualmente.";
    return { data: null, error: message };
  }
}
