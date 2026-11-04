import { describe, expect, it } from "vitest";
import { groupShoppingItems, shoppingCategory } from "./shopping-categories";

describe("corredores da lista de compras", () => {
  it("reconhece hortifrúti, padaria, proteínas, laticínios, mercearia e limpeza", () => {
    expect(shoppingCategory("Banana")).toBe("hortifruti");
    expect(shoppingCategory("Tomate")).toBe("hortifruti");
    expect(shoppingCategory("Pão integral")).toBe("padaria");
    expect(shoppingCategory("Frango")).toBe("proteinas");
    expect(shoppingCategory("Ovos")).toBe("proteinas");
    expect(shoppingCategory("Iogurte natural")).toBe("laticinios");
    expect(shoppingCategory("Arroz")).toBe("mercearia");
    expect(shoppingCategory("Goma de tapioca")).toBe("mercearia");
    expect(shoppingCategory("Detergente")).toBe("limpeza");
  });

  it("não confunde salmão com sal", () => {
    expect(shoppingCategory("Salmão")).toBe("proteinas");
    expect(shoppingCategory("Sal")).toBe("mercearia");
  });

  it("ignora acentos e maiúsculas", () => {
    expect(shoppingCategory("MAMÃO")).toBe("hortifruti");
    expect(shoppingCategory("Açúcar")).toBe("mercearia");
  });

  it("cai em Outros quando não reconhece", () => {
    expect(shoppingCategory("Ração do cachorro")).toBe("outros");
  });

  it("agrupa na ordem do corredor e omite categorias vazias", () => {
    const groups = groupShoppingItems([
      { name: "Detergente" },
      { name: "Arroz" },
      { name: "Banana" },
      { name: "Frango" },
    ]);
    expect(groups.map((group) => group.id)).toEqual(["hortifruti", "proteinas", "mercearia", "limpeza"]);
    expect(groups[0]?.items).toEqual([{ name: "Banana" }]);
  });
});
