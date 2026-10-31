// Browser-only file reading for finance imports. Libraries load on demand.
import { detectDelimiter, parseCsv, type RawRow } from "./finance-import";

/** Read a CSV/XLSX/XLS file into raw string rows. Throws with a user-facing message on failure. */
export async function readSpreadsheetRows(file: File): Promise<RawRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const buffer = await file.arrayBuffer();
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      text = new TextDecoder("windows-1252").decode(buffer);
    }
    if (text.includes("")) {
      const latin1 = new TextDecoder("windows-1252").decode(buffer);
      if (!latin1.includes("")) text = latin1;
    }
    return parseCsv(text, detectDelimiter(text));
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = book.Sheets[book.SheetNames[0]!];
    if (!sheet) throw new Error("A planilha está vazia.");
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, raw: true, defval: "" });
    return rows
      .map((r) => r.map((v) => (v === null || v === undefined ? "" : String(v))))
      .filter((r) => r.some((v) => v.trim() !== ""));
  }
  throw new Error("Formato não aceito. Use CSV, XLSX ou XLS.");
}
