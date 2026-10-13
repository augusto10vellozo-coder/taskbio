// Browser-only text extraction for uploaded workout plans. Libraries load on demand.
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const UNREADABLE_MESSAGE =
  "Não foi possível ler o conteúdo deste arquivo. Envie o arquivo original (não escaneado) ou cadastre os treinos manualmente";

export async function extractPlanText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) return file.text();
  const buffer = await file.arrayBuffer();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const book = XLSX.read(buffer, { type: "array" });
    return book.SheetNames.map((s) => `# ${s}\n${XLSX.utils.sheet_to_csv(book.Sheets[s]!)}`).join("\n\n");
  }
  if (name.endsWith(".docx")) {
    const mammoth = (await import("mammoth/mammoth.browser")) as unknown as { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> };
    return (await mammoth.extractRawText({ arrayBuffer: buffer })).value;
  }
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= Math.min(doc.numPages, 40); i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      pages.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
    }
    return pages.join("\n");
  }
  throw new Error("Formato não aceito. Use PDF, Word (.docx), Excel (.xlsx) ou CSV.");
}

/** True when there is not enough real text to interpret (e.g. scanned documents). */
export const isUnreadable = (text: string) => text.replace(/[\s,;|#-]+/g, "").length < 20;
