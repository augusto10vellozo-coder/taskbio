import { describe, expect, it } from "vitest";
import { FOODS, foodMacros, searchFoods } from "./food-db";
import { mealItemsTotal } from "./meal-summary";

const get = (name: string) => FOODS.find((f) => f.name === name)!;
describe("food base", () => {
  it("has at least 200 foods with household measures", () => {
    expect(FOODS.length).toBeGreaterThanOrEqual(200);
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
  });
  it("finds foods ignoring accents", () => {
    expect(searchFoods("feijao preto")[0]?.name).toBe("Feijão preto cozido");
  });
  it("sums 1 concha de arroz + 1 concha de feijão + 150 g de frango", () => {
    const arroz = foodMacros(get("Arroz branco cozido"), 120);
    const feijao = foodMacros(get("Feijão carioca cozido"), 140);
    const frango = foodMacros(get("Frango grelhado (peito)"), 150);
    expect(mealItemsTotal([{ macros: arroz }, { macros: feijao }, { macros: frango }])).toEqual({ kcal: 499, prot: 57.7, carb: 52.7, gord: 4.7 });
  });
  it("manual total kcal overrides the item sum", () => {
    expect(mealItemsTotal([{ macros: { kcal: 300, prot: 10, carb: 20, gord: 5 } }], 500).kcal).toBe(500);
  });
});
