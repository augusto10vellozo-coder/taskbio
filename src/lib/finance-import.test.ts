import { describe, expect, it } from "vitest";
import { buildReviewRows, detectDelimiter, parseAmount, parseCsv, parseDateValue, parseTypeValue, reviewSummary, suggestMapping } from "./finance-import";
import type { FinanceEntry } from "./finance";

describe("detectDelimiter", () => {
  it("detects comma, semicolon and tab", () => {
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
  });
});

describe("parseCsv", () => {
  it("handles quoted fields with delimiter inside", () => {
    expect(parseCsv('a;"b;c"\n1;2', ";")).toEqual([["a", "b;c"], ["1", "2"]]);
  });
  it("skips empty lines", () => {
    expect(parseCsv("a,b\n\n1,2\n", ",")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("parseAmount", () => {
  it("parses Brazilian format", () => {
    expect(parseAmount("1.234,56")).toEqual({ amount: 1234.56, type: undefined });
    expect(parseAmount("R$ 1.234,56")).toEqual({ amount: 1234.56, type: undefined });
    expect(parseAmount("42,90")).toEqual({ amount: 42.9, type: undefined });
  });
  it("parses international format", () => {
    expect(parseAmount("1234.56")).toEqual({ amount: 1234.56, type: undefined });
    expect(parseAmount("1,234.56")).toEqual({ amount: 1234.56, type: undefined });
  });
  it("handles negative signs: hyphen, parentheses, D suffix; C suffix as credit", () => {
    expect(parseAmount("-50,00")).toEqual({ amount: 50, type: "gasto" });
    expect(parseAmount("(123,45)")).toEqual({ amount: 123.45, type: "gasto" });
    expect(parseAmount("100,00D")).toEqual({ amount: 100, type: "gasto" });
    expect(parseAmount("100,00C")).toEqual({ amount: 100, type: "receita" });
  });
  it("rejects unreadable values instead of assuming zero", () => {
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("--")).toBeNull();
  });
});

describe("parseDateValue", () => {
  it("parses dd/mm/aaaa, dd/mm/aa and aaaa-mm-dd", () => {
    expect(parseDateValue("05/03/2026")).toBe("2026-03-05");
    expect(parseDateValue("5/3/26")).toBe("2026-03-05");
    expect(parseDateValue("2026-03-05")).toBe("2026-03-05");
  });
  it("parses Excel serial numbers", () => {
    expect(parseDateValue(45743)).toBe("2025-03-27"); // known serial
  });
  it("rejects invalid dates", () => {
    expect(parseDateValue("31/02/2026")).toBeNull();
    expect(parseDateValue("hello")).toBeNull();
  });
});

describe("parseTypeValue", () => {
  it("maps common Brazilian labels", () => {
    expect(parseTypeValue("D")).toBe("gasto");
    expect(parseTypeValue("Débito")).toBe("gasto");
    expect(parseTypeValue("C")).toBe("receita");
    expect(parseTypeValue("Crédito")).toBe("receita");
    expect(parseTypeValue("xyz")).toBeNull();
  });
});

describe("suggestMapping", () => {
  it("recognizes Portuguese header variations", () => {
    expect(suggestMapping(["Data", "Histórico", "Valor"])).toEqual({ date: 0, description: 1, amount: 2 });
    expect(suggestMapping(["dt", "memo", "vlr", "categoria"])).toEqual({ date: 0, description: 1, amount: 2, category: 3 });
  });
});

const mapping = { date: 0, description: 1, amount: 2 };

describe("buildReviewRows", () => {
  it("flags invalid rows with a reason and excludes them", () => {
    const rows = buildReviewRows([["05/03/2026", "Mercado", "100,00"], ["xx", "Padaria", "10,00"], ["06/03/2026", "", "5,00"]], mapping, []);
    expect(rows[0]).toMatchObject({ date: "2026-03-05", amount: 100, type: "gasto", included: true });
    expect(rows[1]).toMatchObject({ error: "Data inválida", included: false });
    expect(rows[2]).toMatchObject({ error: "Descrição vazia", included: false });
  });
  it("infers type from the sign when no type column is mapped", () => {
    const rows = buildReviewRows([["05/03/2026", "Salário", "3000,00C"], ["05/03/2026", "Aluguel", "(1.500,00)"]], mapping, []);
    expect(rows[0]).toMatchObject({ type: "receita" });
    expect(rows[1]).toMatchObject({ type: "gasto" });
  });
  it("flags duplicates against existing entries and within the file, excluded by default", () => {
    const existing: FinanceEntry[] = [{ id: "1", date: "2026-03-05", amount: 100, description: "Mercado", category: "Mercado", type: "gasto" }];
    const rows = buildReviewRows([["05/03/2026", "Mercado", "100,00"], ["05/03/2026", "Farmácia", "30,00"], ["05/03/2026", "Farmácia", "30,00"]], mapping, existing);
    expect(rows[0]).toMatchObject({ duplicate: true, included: false });
    expect(rows[1]).toMatchObject({ duplicate: false, included: true });
    expect(rows[2]).toMatchObject({ duplicate: true, included: false });
  });
  it("defaults missing category to Sem categoria", () => {
    const rows = buildReviewRows([["05/03/2026", "Mercado", "100,00"]], mapping, []);
    expect(rows[0]!.category).toBe("Sem categoria");
  });
});

describe("reviewSummary", () => {
  it("computes totals of income and expenses for included rows", () => {
    const rows = buildReviewRows([["05/03/2026", "Salário", "3000,00C"], ["05/03/2026", "Mercado", "100,00"], ["bad", "x", "1"]], mapping, []);
    const s = reviewSummary(rows);
    expect(s).toMatchObject({ total: 3, valid: 2, invalid: 1, included: 2, income: 3000, spent: 100 });
  });
});
