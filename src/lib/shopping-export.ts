import { brl, formatIngredientAmount, type ShoppingItem } from "./trilha-data";
import { groupShoppingItems } from "./shopping-categories";

export const shoppingLines = (items: ShoppingItem[], cost: number) => {
  const lines = ["Compras da semana — TaskBio", ""];
  for (const group of groupShoppingItems(items)) {
    lines.push(group.label.toUpperCase());
    for (const item of group.items) lines.push(`• ${item.name} — ${formatIngredientAmount(item.amount, item.unit)}${item.manual ? " (pessoal)" : ""}`);
    lines.push("");
  }
  lines.push(`Custo estimado do plano: ${brl(cost)}`, "Quantidades e preços são estimativas de planejamento e podem variar.");
  return lines;
};

export async function downloadShoppingPdf(items: ShoppingItem[], cost: number) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([
    import("pdf-lib"), import("@pdf-lib/fontkit"),
  ]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    fetch("/fonts/DejaVuSans.ttf").then((res) => res.arrayBuffer()),
    fetch("/fonts/DejaVuSans-Bold.ttf").then((res) => res.arrayBuffer()),
  ]);
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  const lines = shoppingLines(items, cost);
  let page = pdf.addPage([595, 842]);
  let y = 786;
  const margin = 46;
  const width = 595 - margin * 2;
  const wrap = (text: string, size: number) => {
    const result: string[] = [];
    let line = "";
    for (const word of text.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (regular.widthOfTextAtSize(next, size) > width && line) { result.push(line); line = word; }
      else line = next;
    }
    result.push(line);
    return result;
  };
  lines.forEach((text, index) => {
    const size = index === 0 ? 18 : index >= lines.length - 2 ? 10 : 12;
    const font = index === 0 || index === lines.length - 2 ? bold : regular;
    for (const part of wrap(text, size)) {
      if (y < 60) { page = pdf.addPage([595, 842]); y = 786; }
      if (part) page.drawText(part, { x: margin, y, size, font, color: rgb(0.12, 0.17, 0.2) });
      y -= index === 0 ? 32 : 23;
    }
  });
  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "compras-da-semana-taskbio.pdf"; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}