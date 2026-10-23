export const progressKinds = {
  weight: { label: "Peso", unit: "kg", detail: "Ex.: ao acordar", placeholder: "Ex.: 85,2" },
  measurement: { label: "Medida corporal", unit: "cm", detail: "Ex.: cintura", placeholder: "Ex.: 90" },
  strength: { label: "Carga", unit: "kg", detail: "Ex.: supino", placeholder: "Ex.: 40" },
  run: { label: "Corrida", unit: "min", detail: "Ex.: corrida no parque", placeholder: "Ex.: 30" },
  consistency: { label: "Consistência", unit: "%", detail: "Ex.: rotina semanal", placeholder: "Ex.: 80" },
} as const;

export type ProgressKind = keyof typeof progressKinds;
export type ProgressEntry = { id: string; entry_date: string; kind: string; value: number; unit: string; label: string; notes: string | null };

export function normalizeProgressName(name: string) {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9\s]/g, " ").trim().replace(/\s+/g, " ");
  const aliases: Record<string, string> = {
    peso: "Peso", "peso corporal": "Peso", "peso kg": "Peso", "meu peso": "Peso",
    cintura: "Medida corporal", abdomen: "Medida corporal", medida: "Medida corporal", medidas: "Medida corporal", "medida corporal": "Medida corporal",
    supino: "Carga", agachamento: "Carga", carga: "Carga",
    corrida: "Corrida", run: "Corrida", pace: "Corrida",
    consistencia: "Consistência",
  };
  return aliases[normalized] ?? normalized;
}

export function progressValueError(input: string): string | null {
  if (!input.trim()) return "Informe um valor";
  const value = Number(input.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? null : "Informe um valor numérico positivo";
}

export function progressPayload(kind: ProgressKind, input: string, detail: string, notes: string) {
  return {
    kind, value: Number(input.replace(",", ".")), unit: progressKinds[kind].unit,
    label: normalizeProgressName(progressKinds[kind].label),
    notes: [detail.trim() ? `Detalhe: ${detail.trim()}` : "", notes.trim()].filter(Boolean).join("\n") || null,
  };
}

const DAY = 86_400_000;
export function progressChartData(entries: ProgressEntry[]) {
  return [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date)).map((entry) => ({
    ...entry, value: Number(entry.value), timestamp: Date.parse(`${entry.entry_date}T00:00:00Z`), label: normalizeProgressName(entry.label),
  }));
}

function niceStep(value: number) {
  const power = 10 ** Math.floor(Math.log10(value));
  const fraction = value / power;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) * power;
}

export function progressYAxis(values: number[]) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return null;
  const min = Math.min(...finite), max = Math.max(...finite);
  const range = max - min;
  if (range === 0) {
    const step = niceStep(Math.max(Math.abs(min) * 0.01, 0.1));
    const ticks = [-2, -1, 0, 1, 2].map((offset) => Number((min + offset * step).toPrecision(12)));
    return { domain: [ticks[0] ?? min - 2 * step, ticks[4] ?? min + 2 * step] as [number, number], ticks };
  }
  const lower = min - range * 0.1, upper = max + range * 0.1;
  let step = niceStep((upper - lower) / 4);
  let start = Math.floor(lower / (step / 2)) * (step / 2);
  if (start + 4 * step < upper) {
    step = niceStep(step * 1.01);
    start = Math.floor(lower / (step / 2)) * (step / 2);
  }
  const ticks = Array.from({ length: 5 }, (_, i) => Number((start + i * step).toPrecision(12)));
  return { domain: [ticks[0] ?? lower, ticks[4] ?? upper] as [number, number], ticks };
}

export function progressXAxis(timestamps: number[]) {
  const sorted = [...new Set(timestamps)].sort((a, b) => a - b);
  const first = sorted[0], last = sorted.at(-1);
  if (first === undefined || last === undefined) return null;
  if (first === last) return { domain: [first - DAY, first + DAY] as [number, number], ticks: [first] };
  const ticks = sorted.length <= 5 ? sorted : Array.from({ length: 5 }, (_, i) => sorted[Math.round(i * (sorted.length - 1) / 4)]).filter((tick): tick is number => tick !== undefined);
  return { domain: [first, last] as [number, number], ticks };
}

export function weeklyGoalProgress(value: number, target: number) {
  const percent = target > 0 ? Math.round(value / target * 100) : 0;
  const excess = Math.max(0, value - target);
  return { percent, excess: target > 0 ? excess : 0, status: target === 0 ? "sem meta" : excess > 0 ? `meta superada em ${excess}` : value === target ? "meta atingida" : "em andamento" };
}