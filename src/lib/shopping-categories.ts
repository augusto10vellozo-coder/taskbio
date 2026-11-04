export type ShoppingCategory = "hortifruti" | "padaria" | "proteinas" | "laticinios" | "mercearia" | "limpeza" | "outros";

/** Ordem de corredor: o que costuma vir primeiro numa ida ao mercado. */
export const SHOPPING_CATEGORIES: ReadonlyArray<{ id: ShoppingCategory; label: string }> = [
  { id: "hortifruti", label: "Hortifrúti" },
  { id: "padaria", label: "Padaria" },
  { id: "proteinas", label: "Proteínas" },
  { id: "laticinios", label: "Laticínios" },
  { id: "mercearia", label: "Mercearia" },
  { id: "limpeza", label: "Limpeza e casa" },
  { id: "outros", label: "Outros" },
];

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const tokensOf = (value: string) => normalize(value).split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Palavras que identificam o corredor. A ordem importa: "salmão" precisa ser
 * reconhecido como proteína antes de "sal" cair em mercearia.
 */
const RULES: ReadonlyArray<{ id: ShoppingCategory; words: readonly string[] }> = [
  { id: "proteinas", words: ["frango", "carne", "patinho", "acem", "alcatra", "picanha", "file", "moida", "porco", "lombo", "costela", "linguica", "salsicha", "bacon", "presunto", "mortadela", "peixe", "tilapia", "salmao", "atum", "sardinha", "camarao", "ovo", "ovos"] },
  { id: "laticinios", words: ["leite", "queijo", "iogurte", "manteiga", "requeijao", "ricota", "cottage", "mucarela", "mussarela", "parmesao", "coalhada", "nata"] },
  { id: "hortifruti", words: ["banana", "maca", "laranja", "limao", "tomate", "alface", "cebola", "alho", "cenoura", "batata", "abobrinha", "brocolis", "couve", "espinafre", "pepino", "pimentao", "morango", "mamao", "abacaxi", "uva", "manga", "pera", "melancia", "melao", "salsinha", "coentro", "gengibre", "abobora", "beterraba", "chuchu", "vagem", "milho", "legumes", "salada", "verdura", "fruta", "rucula", "repolho", "quiabo", "berinjela", "mandioca", "aipim", "inhame"] },
  { id: "padaria", words: ["pao", "baguete", "bisnaga", "torrada", "bolo", "rosca", "croissant"] },
  { id: "limpeza", words: ["detergente", "sabao", "sabonete", "amaciante", "desinfetante", "esponja", "alvejante", "shampoo", "condicionador", "desodorante", "absorvente", "fralda", "papel"] },
  { id: "mercearia", words: ["arroz", "feijao", "macarrao", "massa", "espaguete", "oleo", "azeite", "sal", "acucar", "farinha", "cafe", "cha", "aveia", "granola", "cereal", "lentilha", "grao", "molho", "extrato", "tempero", "vinagre", "mel", "achocolatado", "biscoito", "chocolate", "castanha", "amendoim", "quinoa", "tapioca", "goma", "fuba", "polvilho", "fermento", "gelatina", "geleia", "suco", "refrigerante", "agua"] },
];

/** Corredor de um item, a partir do nome livre digitado ou vindo do plano. */
export function shoppingCategory(name: string): ShoppingCategory {
  const tokens = new Set(tokensOf(name));
  for (const rule of RULES) {
    if (rule.words.some((word) => tokens.has(word))) return rule.id;
  }
  return "outros";
}

/** Agrupa mantendo a ordem dos corredores e ignora categorias vazias. */
export function groupShoppingItems<T extends { name: string }>(items: readonly T[]) {
  const buckets = new Map<ShoppingCategory, T[]>();
  for (const item of items) {
    const id = shoppingCategory(item.name);
    buckets.set(id, [...(buckets.get(id) ?? []), item]);
  }
  return SHOPPING_CATEGORIES.flatMap((category) => {
    const group = buckets.get(category.id);
    return group && group.length > 0 ? [{ ...category, items: group }] : [];
  });
}
