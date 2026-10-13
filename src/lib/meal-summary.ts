import type { Block, Meal } from "./trilha-data";

const number = (value: unknown) => {
  const parsed = Number(typeof value === "string" ? value.replace(",", ".") : value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export function mealNutrition(block: Block, getMeal: (id?: string) => Meal | undefined) {
  const meal = getMeal(block.mealId);
  const source = block.manualMeal ?? meal;
  const macros = source?.macros;
  const nutrition = { kcal: number(macros?.kcal), prot: number(macros?.prot), carb: number(macros?.carb), gord: number(macros?.gord) };
  return { ...nutrition, cost: number(source?.cost), known: !!macros && Object.values(nutrition).some((v) => v > 0) };
}

export function mealSummary(blocks: Block[], getMeal: (id?: string) => Meal | undefined) {
  return blocks.filter((b) => b.kind === "refeicao").reduce((total, block) => {
    const value = mealNutrition(block, getMeal);
    return {
      kcal: total.kcal + value.kcal, prot: total.prot + value.prot,
      carb: total.carb + value.carb, gord: total.gord + value.gord,
      cost: total.cost + value.cost, missing: total.missing + (value.known ? 0 : 1),
      known: total.known + (value.known ? 1 : 0),
    };
  }, { kcal: 0, prot: 0, carb: 0, gord: 0, cost: 0, missing: 0, known: 0 });
}

// Correct only known food words, preserving punctuation, unknown names and casing.
const accents: Record<string, string> = {
  feijao: "feijão", feijoes: "feijões", pao: "pão", paes: "pães", mamao: "mamão",
  mamaoes: "mamões", salmao: "salmão", maca: "maçã", macas: "maçãs", acucar: "açúcar",
  acucares: "açúcares", cafe: "café", suino: "suíno", suina: "suína", suinos: "suínos",
  limao: "limão", limoes: "limões", brocolis: "brócolis", pure: "purê", acai: "açaí",
  pessego: "pêssego", pessegos: "pêssegos", maracuja: "maracujá", linguica: "linguiça",
};
export function foodName(value: string) {
  return value.normalize("NFC").replace(/[\p{L}]+/gu, (word) => {
    const corrected = accents[word.toLocaleLowerCase("pt-BR")];
    if (!corrected) return word;
    if (word === word.toLocaleUpperCase("pt-BR")) return corrected.toLocaleUpperCase("pt-BR");
    return word[0] === word[0]?.toLocaleUpperCase("pt-BR") ? corrected.charAt(0).toLocaleUpperCase("pt-BR") + corrected.slice(1) : corrected;
  });
}