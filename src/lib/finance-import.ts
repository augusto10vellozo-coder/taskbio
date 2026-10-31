// Pure parsing/validation for finance statement imports (CSV/Excel). No browser APIs here.
import type { FinanceEntry } from "./finance";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;

export type ImportField = "date" | "amount" | "description" | "type" | "category";
export type ImportMapping = { date: number; amount: number; description: number; type?: number | undefined; category?: number | undefined };
export type SavedMapping = ImportMapping & { id: string; name: string; hasHeader: boolean };

export type RawRow = string[];

export type ParsedAmount = { amount: number; type?: "gasto" | "receita" | undefined };

/** Pick the delimiter that appears most consistently across the first lines: comma, semicolon or tab. */
export function detectDelimiter(sample: string): "," | ";" | "\t" {
  const lines = sample.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
  const candidates: ("," | ";" | "\t")[] = [",", ";", "\t"];
  let best: "," | ";" | "\t" = ",";
  let bestScore = 0;
  for (const d of candidates) {
    const counts = lines.map((l) => l.split(d).length - 1).filter((n) => n > 0);
    const score = counts.length >= 2 && new Set(counts).size === 1 ? counts[0]! * counts.length : counts.length ? 1 : 0;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes). */
export function parseCsv(text: string, delimiter: string): RawRow[] {
  const rows: RawRow[] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((v) => v.trim()));
}

/**
 * Brazilian and international money: "1.234,56", "1234.56", "1,234.56".
 * Strips R$/$ and spaces. Negative via "-", "(123,45)" or suffix "D" (débito); suffix "C" = crédito.
 * Returns null when the value cannot be read safely (never assumes zero).
 */
export function parseAmount(raw: string): ParsedAmount | null {
  let s = String(raw).trim();
  if (!s) return null;
  let type: "gasto" | "receita" | undefined;
  const suffix = s.match(/([DCdc])\s*$/);
  if (suffix) { type = suffix[1]!.toUpperCase() === "D" ? "gasto" : "receita"; s = s.slice(0, -suffix[0].length).trim(); }
  let negative = false;
  const parens = s.match(/^\((.*)\)$/);
  if (parens) { negative = true; s = parens[1]!.trim(); }
  s = s.replace(/[R$\s]/g, "").replace(/^\$/, "");
  if (s.startsWith("-")) { negative = true; s = s.slice(1); }
  if (s.startsWith("+")) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized: string;
  if (lastComma > -1 && lastDot > -1) {
    // Both separators: the last one is the decimal mark.
    normalized = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const parts = s.split(",");
    normalized = parts.length === 2 && parts[1]!.length !== 3 ? s.replace(",", ".") : parts.length > 2 || parts[1]!.length === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot > -1) {
    const parts = s.split(".");
    normalized = parts.length > 2 || (parts.length === 2 && parts[1]!.length === 3) ? s.replace(/\./g, "") : s;
  } else normalized = s;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000_000) return null;
  const amount = Math.round(value * 100) / 100;
  return { amount, type: type ?? (negative ? "gasto" : undefined) };
}

/** Dates: dd/mm/aaaa, dd/mm/aa, aaaa-mm-dd and Excel serial numbers. Returns yyyy-MM-dd or null. */
export function parseDateValue(raw: string | number): string | null {
  if (typeof raw === "number" || /^\d+(\.\d+)?$/.test(String(raw).trim())) {
    const serial = Number(raw);
    if (!Number.isFinite(serial) || serial < 1 || serial > 200000) return null;
    const ms = Math.round((serial - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  let m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const year = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return buildDate(year, Number(m[2]), Number(m[1]));
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return buildDate(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

function buildDate(year: number, month: number, day: number): string | null {
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

/** Type column text → gasto/receita. Accepts D/C, débito/crédito, saída/entrada, gasto/receita. */
export function parseTypeValue(raw: string): "gasto" | "receita" | null {
  const s = String(raw).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/^(d|deb|debito|saida|gasto|despesa|pagamento)$/.test(s)) return "gasto";
  if (/^(c|cre|credito|entrada|receita|recebimento)$/.test(s)) return "receita";
  return null;
}

const HEADER_HINTS: Record<ImportField, string[]> = {
  date: ["data", "dt", "date", "data lancamento", "data do lancamento", "data da transacao"],
  amount: ["valor", "vlr", "amount", "montante", "valor (r$)", "valor r$"],
  description: ["descricao", "historico", "lancamento", "memo", "detalhes", "descricao da transacao", "titulo"],
  type: ["tipo", "type", "natureza", "d/c"],
  category: ["categoria", "category"],
};

const normalizeHeader = (h: string) => h.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");

/** Suggest column indexes from header names (Portuguese variations). */
export function suggestMapping(headers: string[]): Partial<Record<ImportField, number>> {
  const normalized = headers.map(normalizeHeader);
  const out: Partial<Record<ImportField, number>> = {};
  (Object.keys(HEADER_HINTS) as ImportField[]).forEach((field) => {
    const hints = HEADER_HINTS[field];
    const idx = normalized.findIndex((h) => hints.includes(h) || hints.some((hint) => hint.length > 2 && h.startsWith(hint)));
    if (idx > -1) out[field] = idx;
  });
  return out;
}

export type ReviewRow = {
  index: number;
  date?: string;
  amount?: number;
  type?: "gasto" | "receita";
  description?: string;
  category?: string;
  error?: string;
  duplicate?: boolean;
  included: boolean;
};

export const entrySignature = (e: { date: string; amount: number; description: string }) =>
  `${e.date}|${e.amount.toFixed(2)}|${e.description.trim().toLowerCase().replace(/\s+/g, " ")}`;

/** Build review rows from raw spreadsheet rows + mapping. Invalid rows get a reason; duplicates are excluded by default. */
export function buildReviewRows(rows: RawRow[], mapping: ImportMapping, existing: FinanceEntry[]): ReviewRow[] {
  const seen = new Set(existing.map(entrySignature));
  const inFile = new Set<string>();
  return rows.map((cells, index) => {
    const get = (i: number | undefined) => (i === undefined ? "" : (cells[i] ?? "").trim());
    const date = parseDateValue(get(mapping.date));
    const parsed = parseAmount(get(mapping.amount));
    const description = get(mapping.description);
    const typeCol = mapping.type !== undefined ? parseTypeValue(get(mapping.type)) : null;
    const category = get(mapping.category);
    let error: string | undefined;
    if (!date) error = "Data inválida";
    else if (!parsed) error = "Valor inválido";
    else if (!description) error = "Descrição vazia";
    if (error) return { index, error, included: false };
    const type = typeCol ?? parsed!.type ?? "gasto";
    const sig = entrySignature({ date: date!, amount: parsed!.amount, description });
    const duplicate = seen.has(sig) || inFile.has(sig);
    inFile.add(sig);
    return { index, date: date!, amount: parsed!.amount, type, description, category: category || "Sem categoria", duplicate, included: !duplicate };
  });
}

export const reviewSummary = (rows: ReviewRow[]) => {
  const valid = rows.filter((r) => !r.error);
  const invalid = rows.filter((r) => r.error);
  const included = valid.filter((r) => r.included);
  return {
    total: rows.length,
    valid: valid.length,
    invalid: invalid.length,
    duplicates: valid.filter((r) => r.duplicate).length,
    included: included.length,
    income: Math.round(included.filter((r) => r.type === "receita").reduce((n, r) => n + (r.amount ?? 0), 0) * 100) / 100,
    spent: Math.round(included.filter((r) => r.type === "gasto").reduce((n, r) => n + (r.amount ?? 0), 0) * 100) / 100,
  };
};
