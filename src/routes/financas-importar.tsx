import { ModuleHeader } from "@/components/ModuleHeader";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FileUp, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTaskBio } from "@/lib/trilha-store";
import { brl, emptyFinance, type SavedImportMapping } from "@/lib/finance";
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, buildReviewRows, reviewSummary, suggestMapping, type ImportField, type RawRow, type ReviewRow } from "@/lib/finance-import";
import { readSpreadsheetRows } from "@/lib/finance-import-browser";

export const Route = createFileRoute("/financas-importar")({
  head: () => ({ meta: [
    { title: "Importar extrato — TaskBio" },
    { name: "description", content: "Importe receitas e despesas de uma planilha CSV ou Excel para o módulo de Finanças." },
    { property: "og:title", content: "Importar extrato — TaskBio" },
    { property: "og:description", content: "Traga seus lançamentos de uma planilha em poucos passos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: FinancasImportar,
});

const field = "h-10 rounded-md bg-background px-3 text-sm ring-1 ring-line";
const FIELDS: { key: ImportField; label: string; required?: boolean }[] = [
  { key: "date", label: "Data", required: true },
  { key: "amount", label: "Valor", required: true },
  { key: "description", label: "Descrição", required: true },
  { key: "type", label: "Tipo (entrada/saída)" },
  { key: "category", label: "Categoria" },
];

type Step = "upload" | "mapping" | "review";

function FinancasImportar() {
  const { finance: raw, setFinance } = useTaskBio();
  const f = { ...emptyFinance, ...raw };
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, number | undefined>>>({});
  const [review, setReview] = useState<ReviewRow[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [mappingName, setMappingName] = useState("");
  const [busy, setBusy] = useState(false);

  const saved = f.importMappings ?? [];
  const headers = rows[0] ?? [];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const columnLabel = (i: number) => (hasHeader && headers[i]?.trim() ? headers[i]!.trim() : `Coluna ${i + 1}`);

  const openFile = async (file: File) => {
    if (file.size > MAX_IMPORT_BYTES) { toast.error("Arquivo acima de 5 MB. Divida o extrato em partes menores."); return; }
    setBusy(true);
    try {
      const parsed = await readSpreadsheetRows(file);
      if (parsed.length > MAX_IMPORT_ROWS + 1) { toast.error("Arquivo com mais de 2.000 linhas. Divida o extrato em partes menores."); return; }
      if (parsed.length < 1) { toast.error("Não encontramos linhas neste arquivo."); return; }
      setRows(parsed); setFileName(file.name); setSavedId(null);
      setMapping(suggestMapping(parsed[0] ?? []));
      setHasHeader(true); setStep("mapping");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível ler este arquivo.");
    } finally { setBusy(false); }
  };

  const applySaved = (m: SavedImportMapping) => {
    setSavedId(m.id); setHasHeader(m.hasHeader);
    setMapping({ date: m.date, amount: m.amount, description: m.description, type: m.type, category: m.category });
  };

  const mappingReady = mapping.date !== undefined && mapping.amount !== undefined && mapping.description !== undefined;

  const goReview = () => {
    if (!mappingReady) { toast.error("Mapeie Data, Valor e Descrição para continuar"); return; }
    setReview(buildReviewRows(dataRows, mapping as SavedImportMapping, f.entries));
    setStep("review");
  };

  const summary = reviewSummary(review);
  const includedRows = review.filter((r) => r.included && !r.error);

  const confirmImport = () => {
    const stamp = Date.now();
    const entries = includedRows.map((r, i) => ({
      id: `imp-${stamp}-${i}`,
      date: r.date!, amount: r.amount!, description: r.description!, category: r.category || "Sem categoria", type: r.type!, source: "importado" as const,
    }));
    setFinance((s) => {
      let next = { ...s, entries: [...entries, ...s.entries] };
      const name = mappingName.trim();
      if (name && mappingReady) {
        const m: SavedImportMapping = { id: savedId ?? `map-${stamp}`, name, hasHeader, date: mapping.date!, amount: mapping.amount!, description: mapping.description!, type: mapping.type, category: mapping.category };
        next = { ...next, importMappings: [m, ...(s.importMappings ?? []).filter((x) => x.id !== m.id)] };
      }
      return next;
    });
    const ignored = summary.total - includedRows.length;
    toast.success(ignored > 0 ? `${entries.length} lançamentos importados · ${ignored} ignorados` : `${entries.length} lançamentos importados`);
    navigate({ to: "/financas" });
  };

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <ModuleHeader title="Importar extrato" />

      {step === "upload" && (
        <section className="rounded-lg bg-card p-5 ring-1 ring-line">
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void openFile(file); e.target.value = ""; }} />
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center rounded-lg border-2 border-dashed border-line px-4 py-10 text-center">
            <UploadCloud className="size-10 text-steel" strokeWidth={1.5} aria-hidden />
            <span className="mt-3 text-sm font-medium">{busy ? "Lendo arquivo..." : "Escolher arquivo CSV ou Excel"}</span>
            <span className="mt-1 text-xs text-steel">Até 5 MB e 2.000 linhas · .csv, .xlsx ou .xls</span>
          </button>
          {saved.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-steel">Mapeamentos salvos</p>
              <ul className="mt-2 space-y-1">{saved.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  <Button size="sm" variant="outline" onClick={() => { applySaved(m); inputRef.current?.click(); }}>Usar</Button>
                  <Button size="icon" variant="ghost" className="size-7" aria-label={`Remover mapeamento ${m.name}`} onClick={() => setFinance((s) => ({ ...s, importMappings: (s.importMappings ?? []).filter((x) => x.id !== m.id) }))}><Trash2 /></Button>
                </li>
              ))}</ul>
            </div>
          )}
        </section>
      )}

      {step === "mapping" && (
        <section className="rounded-lg bg-card p-4 ring-1 ring-line">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <FileUp className="size-4 text-steel" aria-hidden />
            <span className="min-w-0 flex-1 truncate font-medium">{fileName}</span>
            <Button size="sm" variant="outline" onClick={() => { setStep("upload"); setRows([]); setFileName(null); }}>Escolher outro arquivo</Button>
          </div>

          <h2 className="mt-4 font-display text-lg font-semibold">Pré-visualização</h2>
          <div className="mt-2 overflow-x-auto rounded-md ring-1 ring-line">
            <table className="w-full min-w-105 text-xs">
              <tbody>{rows.slice(0, 5).map((r, i) => (
                <tr key={i} className={i === 0 && hasHeader ? "bg-mist font-medium" : ""}>{r.map((c, j) => <td key={j} className="max-w-40 truncate px-2 py-1.5">{c || "—"}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={!hasHeader} onChange={(e) => setHasHeader(!e.target.checked)} /> Primeira linha é dado, não cabeçalho</label>

          <h2 className="mt-4 font-display text-lg font-semibold">Mapear colunas</h2>
          <p className="text-xs text-steel">Confira se cada campo aponta para a coluna certa do arquivo.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {FIELDS.map(({ key, label, required }) => (
              <label key={key} className="text-xs text-steel">{label}{required && " *"}
                <select aria-label={label} value={mapping[key] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value === "" ? undefined : Number(e.target.value) }))} className={`${field} mt-1 w-full`}>
                  <option value="">{required ? "Escolher coluna" : "Não importar"}</option>
                  {headers.map((_, i) => <option key={i} value={i}>{columnLabel(i)}</option>)}
                </select>
              </label>
            ))}
          </div>

          <label className="mt-3 block text-xs text-steel">Salvar este mapeamento como (opcional)
            <input value={mappingName} onChange={(e) => setMappingName(e.target.value)} placeholder="ex.: Nubank — CSV" className={`${field} mt-1 w-full`} />
          </label>

          <div className="mt-4 flex gap-2">
            <Button disabled={!mappingReady} onClick={goReview}>Revisar lançamentos</Button>
            <Button variant="ghost" onClick={() => setStep("upload")}>Voltar</Button>
          </div>
        </section>
      )}

      {step === "review" && (
        <section className="rounded-lg bg-card p-4 ring-1 ring-line">
          <h2 className="font-display text-lg font-semibold">Revisão</h2>
          <p className="mt-1 text-sm text-steel">{summary.total} linhas lidas · {summary.valid} válidas · {summary.invalid} com erro{summary.duplicates > 0 ? ` · ${summary.duplicates} já importadas` : ""}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-mist p-3"><p className="text-xs text-steel">Total de entradas</p><p className="font-display text-lg font-semibold text-brand-deep">{brl(summary.income)}</p></div>
            <div className="rounded-md bg-mist p-3"><p className="text-xs text-steel">Total de saídas</p><p className="font-display text-lg font-semibold">{brl(summary.spent)}</p></div>
          </div>

          {summary.invalid > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold">Linhas com erro</h3>
              <ul className="mt-1 divide-y divide-line text-sm">{review.filter((r) => r.error).map((r) => (
                <li key={r.index} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 text-xs text-steel">Linha {r.index + (hasHeader ? 2 : 1)} · {r.error}</span>
                  <span className="text-xs text-steel">ignorada</span>
                </li>
              ))}</ul>
            </div>
          )}

          {summary.duplicates > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold">Já importados</h3>
              <p className="text-xs text-steel">Mesma data, valor e descrição de um lançamento existente. Desmarcados por padrão — marque se quiser incluir mesmo assim.</p>
              <ul className="mt-1 divide-y divide-line text-sm">{review.filter((r) => r.duplicate && !r.error).map((r) => (
                <li key={r.index} className="flex items-center gap-2 py-2">
                  <input type="checkbox" aria-label={`Incluir ${r.description}`} checked={r.included} onChange={(e) => setReview((rs) => rs.map((x) => (x.index === r.index ? { ...x, included: e.target.checked } : x)))} />
                  <span className="min-w-0 flex-1 truncate">{r.description} <span className="text-xs text-steel">· {r.date!.split("-").reverse().join("/")}</span></span>
                  <span className="font-medium">{brl(r.amount!)}</span>
                </li>
              ))}</ul>
            </div>
          )}

          <div className="mt-4">
            <h3 className="text-sm font-semibold">Prontos para importar ({includedRows.length})</h3>
            <ul className="mt-1 max-h-64 divide-y divide-line overflow-y-auto text-sm">{includedRows.slice(0, 50).map((r) => (
              <li key={r.index} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate">{r.description} <span className="text-xs text-steel">· {r.category} · {r.date!.split("-").reverse().join("/")}</span></span>
                <span className={r.type === "receita" ? "font-medium text-brand-deep" : "font-medium"}>{r.type === "receita" ? "+" : "−"}{brl(r.amount!)}</span>
              </li>
            ))}</ul>
            {includedRows.length > 50 && <p className="mt-1 text-xs text-steel">Mostrando 50 de {includedRows.length}.</p>}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={includedRows.length === 0} onClick={confirmImport}>Importar {includedRows.length} lançamentos</Button>
            <Button variant="outline" onClick={() => setStep("mapping")}>Voltar ao mapeamento</Button>
          </div>
        </section>
      )}
    </main>
  );
}
