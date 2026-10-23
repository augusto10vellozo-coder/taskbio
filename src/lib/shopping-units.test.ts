import { describe, expect, it } from "vitest";
import { consolidateIngredients, normalizeUnit, SHOPPING_UNITS } from "./trilha-data";

const meal = (ings: { name: string; qty: string }[]) => ({ ingredients: ings }) as never;

describe("compras", () => {
  it("oferece só un/kg/g/L/ml", () => expect([...SHOPPING_UNITS]).toEqual(["un", "kg", "g", "L", "ml"]));
  it("migra unidades antigas", () => {
    expect(["unid", "UN", "unidade"].map(normalizeUnit)).toEqual(["un", "un", "un"]);
    expect(["litro", "l"].map(normalizeUnit)).toEqual(["L", "L"]);
    expect(["quilo", "kilo"].map(normalizeUnit)).toEqual(["kg", "kg"]);
    expect(["grama", "gramas", "mililitro"].map(normalizeUnit)).toEqual(["g", "g", "ml"]);
  });
  it("consolida nomes iguais ignorando caixa, acento e espaços", () => {
    const r = consolidateIngredients([meal([{ name: "Banana prata", qty: "2 un" }, { name: "banana prata ", qty: "3 unidade" }])]);
    expect(r).toHaveLength(1);
    expect(r[0]?.amount).toBe(5);
  });
  it("mantém unidades diferentes separadas", () => {
    expect(consolidateIngredients([meal([{ name: "Tomate", qty: "500 g" }, { name: "Tomate", qty: "2 un" }])])).toHaveLength(2);
  });
});
