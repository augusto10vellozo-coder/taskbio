export const DAYS = [
  { key: "seg", short: "Seg", long: "Segunda-feira" },
  { key: "ter", short: "Ter", long: "Terça-feira" },
  { key: "qua", short: "Qua", long: "Quarta-feira" },
  { key: "qui", short: "Qui", long: "Quinta-feira" },
  { key: "sex", short: "Sex", long: "Sexta-feira" },
  { key: "sab", short: "Sáb", long: "Sábado" },
  { key: "dom", short: "Dom", long: "Domingo" },
] as const;

export type DayKey = (typeof DAYS)[number]["key"];

export type BlockKind = "refeicao" | "treino" | "compromisso" | "descanso";

export type Macros = { kcal: number; prot: number; carb: number; gord: number };

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restSec: number;
  muscles: string;
  howTo: string;
  loadKg?: number | undefined;
  doneSets: number;
  seriesByDate?: Record<string, { done: boolean; loadKg?: number | undefined }[]>;
};

export type Workout = {
  id: string;
  /** Set on copies scheduled in the week; points at the model in "Meus treinos". */
  templateId?: string;
  name: string;
  focus: string;
  modality: string;
  exercises: Exercise[];
};

export type ObjectiveEffect = {
  focus: string;
  frequency: string;
  intensity: string;
  duration: string;
  recovery: string;
};

export type WorkoutHistoryEntry = {
  id: string;
  workoutId: string;
  workoutName: string;
  completedAt: string;
  durationSec: number;
  completedSets: number;
  totalVolumeKg: number;
  exercises: {
    exerciseId: string;
    name: string;
    sets: number;
    reps: number;
    loadKg: number;
  }[];
};

export type Meal = {
  id: string;
  name: string;
  items: string;
  macros: Macros;
  cost: number;
  ingredients: { name: string; qty: string; amount?: number; unit?: string }[];
};

export type ShoppingItem = {
  id: string;
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
  manual?: boolean;
};

export type Block = {
  id: string;
  time: string;
  kind: BlockKind;
  title: string;
  endTime?: string;
  note?: string;
  done: boolean;
  mealId?: string;
  manualMeal?: {
    portion: string;
    macros: Macros;
    cost: number;
    items?: { foodId?: string; name: string; grams: number; portion: string; macros: Macros }[] | undefined;
    kcalOverride?: number | undefined;
  };
  workoutId?: string;
  reminderMinutes?: number;
  photoPath?: string;
  recurrence?: "none" | "weekdays" | "daily";
  recurrenceUntil?: string;
};

export type Plan = Record<string, Block[]>;

export const EMPTY_PLAN: Plan = {};

export const MEALS: Meal[] = [
  {
    id: "m1",
    name: "Café da manhã",
    items: "Ovos + pão integral + banana",
    macros: { kcal: 420, prot: 25, carb: 40, gord: 17 },
    cost: 6.5,
    ingredients: [
      { name: "Ovos", qty: "3 un" },
      { name: "Pão integral", qty: "2 fatias" },
      { name: "Banana", qty: "1 un" },
    ],
  },
  {
    id: "m2",
    name: "Almoço",
    items: "Frango grelhado + arroz + salada",
    macros: { kcal: 560, prot: 38, carb: 52, gord: 14 },
    cost: 11.2,
    ingredients: [
      { name: "Frango", qty: "180 g" },
      { name: "Arroz", qty: "150 g" },
      { name: "Salada", qty: "1 porção" },
    ],
  },
  {
    id: "m3",
    name: "Jantar",
    items: "Salmão + batata + legumes",
    macros: { kcal: 610, prot: 42, carb: 30, gord: 28 },
    cost: 18.9,
    ingredients: [
      { name: "Salmão", qty: "160 g" },
      { name: "Batata", qty: "200 g" },
      { name: "Legumes", qty: "150 g" },
    ],
  },
  {
    id: "m4",
    name: "Lanche da tarde",
    items: "Iogurte + aveia + mel",
    macros: { kcal: 280, prot: 18, carb: 34, gord: 7 },
    cost: 5.4,
    ingredients: [
      { name: "Iogurte natural", qty: "170 g" },
      { name: "Aveia", qty: "40 g" },
      { name: "Mel", qty: "1 colher" },
    ],
  },
  {
    id: "m5",
    name: "Café reforçado",
    items: "Omelete + tapioca + mamão",
    macros: { kcal: 480, prot: 28, carb: 46, gord: 16 },
    cost: 7.8,
    ingredients: [
      { name: "Ovos", qty: "3 un" },
      { name: "Goma de tapioca", qty: "80 g" },
      { name: "Mamão", qty: "1 fatia" },
    ],
  },
];

const ex = (
  id: string,
  name: string,
  sets: number,
  reps: number,
  restSec: number,
  muscles: string,
  howTo: string,
): Exercise => ({ id, name, sets, reps, restSec, muscles, howTo, doneSets: 0 });

export const WORKOUTS: Workout[] = [
  {
    id: "w1",
    name: "Treino A",
    focus: "Peito e Tríceps",
    modality: "Musculação · Hipertrofia",
    exercises: [
      ex("e1", "Supino reto", 4, 10, 60, "Peitoral maior, tríceps", "Desça a barra até a linha do peito e suba controlando."),
      ex("e2", "Supino inclinado", 3, 12, 60, "Peitoral superior", "Banco a 30°, escápulas apoiadas."),
      ex("e3", "Crucifixo", 3, 12, 45, "Peitoral", "Cotovelos levemente flexionados, movimento em arco."),
      ex("e4", "Tríceps pulley", 4, 10, 60, "Tríceps", "Cotovelos fixos junto ao tronco."),
      ex("e5", "Tríceps francês", 3, 12, 45, "Tríceps", "Desça atrás da cabeça sem abrir os cotovelos."),
    ],
  },
  {
    id: "w2",
    name: "Treino B",
    focus: "Costas e Bíceps",
    modality: "Musculação · Hipertrofia",
    exercises: [
      ex("e6", "Puxada frontal", 4, 10, 60, "Dorsais", "Puxe até a linha da clavícula."),
      ex("e7", "Remada curvada", 4, 10, 60, "Dorsais, lombar", "Tronco inclinado, coluna neutra."),
      ex("e8", "Rosca direta", 3, 12, 45, "Bíceps", "Cotovelos parados ao lado do corpo."),
      ex("e9", "Rosca martelo", 3, 12, 45, "Bíceps, antebraço", "Pegada neutra."),
    ],
  },
  {
    id: "w3",
    name: "Treino C",
    focus: "Pernas",
    modality: "Musculação · Força",
    exercises: [
      ex("e10", "Agachamento livre", 4, 8, 90, "Quadríceps, glúteos", "Desça até a coxa paralela ao chão."),
      ex("e11", "Leg press", 4, 12, 60, "Quadríceps", "Não estenda totalmente os joelhos."),
      ex("e12", "Cadeira flexora", 3, 12, 45, "Posteriores", "Movimento controlado."),
      ex("e13", "Panturrilha em pé", 4, 15, 30, "Tríceps sural", "Amplitude completa."),
    ],
  },
  {
    id: "w4",
    name: "Corrida leve",
    focus: "Condicionamento",
    modality: "Corrida · 5 km",
    exercises: [
      ex("e14", "Aquecimento", 1, 1, 0, "Corpo inteiro", "Caminhada rápida por 5 minutos."),
      ex("e15", "Corrida contínua", 1, 1, 0, "Cardiorrespiratório", "30 minutos em ritmo confortável."),
      ex("e16", "Alongamento", 1, 1, 0, "Corpo inteiro", "5 minutos ao final."),
    ],
  },
];

export const ACTIVITY_CATALOG = [
  { group: "Academia", items: ["Musculação", "Hipertrofia", "Força", "Emagrecimento", "Treino funcional"] },
  { group: "Corrida", items: ["Caminhada", "Corrida", "Intervalado", "5 km", "10 km"] },
  { group: "Lutas", items: ["Boxe", "Muay Thai", "Jiu-Jitsu", "Judô", "Karatê", "Kickboxing", "MMA"] },
  {
    group: "Outras",
    items: ["Pilates", "Yoga", "Cross training", "Ciclismo", "Natação", "Calistenia", "Dança", "Alongamento", "Mobilidade"],
  },
];

export const GOALS = [
  "Ganhar massa muscular",
  "Melhorar condicionamento",
  "Começar a correr",
  "Ser mais ativo",
  "Organizar minha rotina",
  "Melhorar alimentação",
];

export const OBJECTIVE_EFFECTS: Record<string, ObjectiveEffect> = {
  "Ganhar massa muscular": { focus: "mais volume e progressão gradual", frequency: "3 a 5 vezes por semana", intensity: "moderada, com técnica controlada", duration: "45 a 70 minutos", recovery: "intervalos de 60 a 90 segundos" },
  "Melhorar condicionamento": { focus: "resistência e capacidade cardiorrespiratória", frequency: "3 a 4 vezes por semana", intensity: "leve a moderada, com progressão", duration: "30 a 50 minutos", recovery: "pausas curtas e recuperação ativa" },
  "Começar a correr": { focus: "adaptação gradual entre caminhada e corrida", frequency: "2 a 3 vezes por semana", intensity: "leve, permitindo conversar", duration: "20 a 40 minutos", recovery: "ao menos um dia entre sessões" },
  "Ser mais ativo": { focus: "movimento frequente e sustentável", frequency: "3 a 5 momentos na semana", intensity: "leve a moderada", duration: "20 a 40 minutos", recovery: "conforme disposição e rotina" },
  "Organizar minha rotina": { focus: "sessões simples e fáceis de encaixar", frequency: "2 a 4 vezes por semana", intensity: "adaptável ao tempo disponível", duration: "20 a 45 minutos", recovery: "dias e horários consistentes" },
  "Melhorar alimentação": { focus: "atividade regular como apoio à rotina saudável", frequency: "2 a 4 vezes por semana", intensity: "leve a moderada", duration: "25 a 45 minutos", recovery: "sono, hidratação e alimentação adequados" },
};

const MODALITY_MOVEMENTS: Record<string, [string, string, string, string]> = {
  Musculação: ["Agachamento com peso corporal", "Remada", "Supino com halteres", "Elevação pélvica"],
  Hipertrofia: ["Agachamento", "Supino", "Remada", "Desenvolvimento"],
  Força: ["Agachamento", "Levantamento terra técnico", "Supino", "Remada"],
  Emagrecimento: ["Agachamento livre", "Remada elástica", "Polichinelo adaptado", "Prancha"],
  "Treino funcional": ["Agachamento", "Avanço", "Remada elástica", "Prancha"],
  Caminhada: ["Aquecimento caminhando", "Caminhada confortável", "Passos mais rápidos", "Desaceleração"],
  Corrida: ["Caminhada de aquecimento", "Corrida leve", "Caminhada de recuperação", "Desaceleração"],
  Intervalado: ["Aquecimento", "Intervalo moderado", "Recuperação ativa", "Volta à calma"],
  "5 km": ["Aquecimento", "Corrida contínua leve", "Acelerações curtas", "Volta à calma"],
  "10 km": ["Aquecimento", "Corrida contínua", "Trecho em ritmo confortável", "Volta à calma"],
  Boxe: ["Base e deslocamento", "Jab e direto no ar", "Esquivas técnicas", "Mobilidade final"],
  "Muay Thai": ["Base e guarda", "Sequência técnica no ar", "Joelhadas controladas", "Mobilidade final"],
  "Jiu-Jitsu": ["Mobilidade de quadril", "Fuga de quadril", "Movimentos técnicos sem parceiro", "Alongamento leve"],
  Judô: ["Mobilidade e quedas educativas", "Deslocamento e pegada", "Entrada técnica sem projeção", "Alongamento leve"],
  Karatê: ["Base e postura", "Golpes fundamentais no ar", "Deslocamentos", "Mobilidade final"],
  Kickboxing: ["Base e deslocamento", "Combinações no ar", "Chutes controlados", "Mobilidade final"],
  MMA: ["Mobilidade", "Combinações no ar", "Movimentos de solo sem parceiro", "Volta à calma"],
  Pilates: ["Respiração e alinhamento", "Ponte", "Dead bug", "Mobilidade de coluna"],
  Yoga: ["Respiração", "Saudação ao sol adaptada", "Posturas em pé", "Relaxamento"],
  "Cross training": ["Mobilidade", "Agachamento", "Remada elástica", "Circuito leve"],
  Ciclismo: ["Giro leve", "Cadência confortável", "Trecho moderado", "Giro de recuperação"],
  Natação: ["Aquecimento fora da água", "Nado leve", "Técnica de braçada", "Recuperação"],
  Calistenia: ["Agachamento", "Flexão adaptada", "Remada australiana adaptada", "Prancha"],
  Dança: ["Mobilidade rítmica", "Passos básicos", "Sequência contínua", "Desaceleração"],
  Alongamento: ["Pescoço e ombros", "Quadril", "Posteriores de coxa", "Respiração"],
  Mobilidade: ["Coluna torácica", "Quadril", "Tornozelos", "Ombros"],
};

const DEFAULT_MODALITY_MOVEMENTS: [string, string, string, string] = [
  "Agachamento",
  "Avanço",
  "Remada elástica",
  "Prancha",
];

export function getWorkoutExamples(modality: string, goal: string | null): Workout[] {
  const movements = MODALITY_MOVEMENTS[modality] ?? DEFAULT_MODALITY_MOVEMENTS;
  const strengthGoal = goal === "Ganhar massa muscular";
  const starterGoal = goal === "Começar a correr" || goal === "Ser mais ativo";
  const isCardio = ["Caminhada", "Corrida", "Intervalado", "5 km", "10 km", "Ciclismo", "Natação", "Dança"].includes(modality);
  const sets = starterGoal ? 2 : strengthGoal ? 4 : 3;
  const reps = isCardio ? 5 : strengthGoal ? 10 : 12;
  const rest = strengthGoal ? 75 : isCardio ? 60 : 45;
  const makeExercise = (name: string, index: number, easier = false): Exercise => ({
    id: `suggestion-${modality}-${index}-${easier ? "intro" : "base"}`,
    name,
    sets: easier ? Math.max(1, sets - 1) : sets,
    reps,
    restSec: rest,
    muscles: isCardio ? "Condicionamento e coordenação" : "Movimentos gerais da modalidade",
    howTo: isCardio ? "Faça por cerca de 5 minutos em ritmo confortável." : "Execute devagar, respeitando sua amplitude e sem dor.",
    doneSets: 0,
  });
  return [
    {
      id: `example-${modality}-intro`,
      name: `${modality} — início`,
      focus: goal ?? "Movimento e adaptação",
      modality,
      exercises: movements.slice(0, 3).map((movement, index) => makeExercise(movement, index, true)),
    },
    {
      id: `example-${modality}-base`,
      name: `${modality} — base`,
      focus: goal ?? "Prática geral",
      modality,
      exercises: movements.map((movement, index) => makeExercise(movement, index)),
    },
  ];
}

export const INITIAL_PLAN: Plan = {
  seg: [
    { id: "b1", time: "06:30", kind: "refeicao", title: "Café da manhã", mealId: "m1", done: true },
    { id: "b2", time: "08:00", endTime: "12:00", kind: "compromisso", title: "Trabalho", note: "Reunião de planejamento", done: true },
    { id: "b3", time: "12:30", kind: "refeicao", title: "Almoço", mealId: "m2", done: false },
    { id: "b4", time: "18:00", kind: "treino", title: "Academia", workoutId: "w1", done: false },
    { id: "b5", time: "20:00", kind: "refeicao", title: "Jantar", mealId: "m3", done: false },
    { id: "b6", time: "22:30", kind: "descanso", title: "Dormir", note: "Meta: 7h30", done: false },
  ],
  ter: [
    { id: "b7", time: "06:30", kind: "refeicao", title: "Café da manhã", mealId: "m5", done: false },
    { id: "b8", time: "08:00", endTime: "17:30", kind: "compromisso", title: "Trabalho", done: false },
    { id: "b9", time: "12:30", kind: "refeicao", title: "Almoço", mealId: "m2", done: false },
    { id: "b10", time: "18:30", kind: "treino", title: "Academia", workoutId: "w2", done: false },
    { id: "b11", time: "20:00", kind: "refeicao", title: "Jantar", mealId: "m3", done: false },
    { id: "b12", time: "22:30", kind: "descanso", title: "Dormir", done: false },
  ],
  qua: [
    { id: "b13", time: "06:30", kind: "refeicao", title: "Café da manhã", mealId: "m1", done: false },
    { id: "b14", time: "07:15", kind: "treino", title: "Corrida", workoutId: "w4", done: false },
    { id: "b15", time: "12:30", kind: "refeicao", title: "Almoço", mealId: "m2", done: false },
    { id: "b16", time: "19:00", kind: "compromisso", title: "Estudar", note: "1h30 de leitura", done: false },
    { id: "b17", time: "20:00", kind: "refeicao", title: "Jantar", mealId: "m3", done: false },
  ],
  qui: [
    { id: "b18", time: "06:30", kind: "refeicao", title: "Café da manhã", mealId: "m5", done: false },
    { id: "b19", time: "12:30", kind: "refeicao", title: "Almoço", mealId: "m2", done: false },
    { id: "b20", time: "18:30", kind: "treino", title: "Academia", workoutId: "w3", done: false },
    { id: "b21", time: "20:00", kind: "refeicao", title: "Jantar", mealId: "m3", done: false },
  ],
  sex: [
    { id: "b22", time: "06:30", kind: "refeicao", title: "Café da manhã", mealId: "m1", done: false },
    { id: "b23", time: "16:00", kind: "refeicao", title: "Lanche da tarde", mealId: "m4", done: false },
    { id: "b24", time: "18:30", kind: "treino", title: "Academia", workoutId: "w1", done: false },
    { id: "b25", time: "20:30", kind: "refeicao", title: "Jantar", mealId: "m3", done: false },
  ],
  sab: [
    { id: "b26", time: "09:00", kind: "refeicao", title: "Café da manhã", mealId: "m5", done: false },
    { id: "b27", time: "10:00", kind: "treino", title: "Corrida", workoutId: "w4", done: false },
    { id: "b28", time: "13:00", kind: "refeicao", title: "Almoço", mealId: "m2", done: false },
  ],
  dom: [
    { id: "b29", time: "09:30", kind: "refeicao", title: "Café da manhã", mealId: "m1", done: false },
    { id: "b30", time: "12:00", kind: "descanso", title: "Descanso", note: "Dia livre", done: false },
    { id: "b31", time: "19:00", kind: "refeicao", title: "Jantar", mealId: "m3", done: false },
  ],
};

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const parseIngredientQuantity = (qty: string) => {
  const match = qty.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  return match
    ? { amount: Number(match[1]?.replace(",", ".")) || 1, unit: match[2]?.trim() || "un" }
    : { amount: 1, unit: qty.trim() || "un" };
};

export const SHOPPING_UNITS = ["un", "kg", "g", "L", "ml"] as const;
const UNIT_ALIASES: Record<string, string> = { un: "un", unid: "un", unidade: "un", unidades: "un", kg: "kg", quilo: "kg", kilo: "kg", g: "g", grama: "g", gramas: "g", l: "L", litro: "L", litros: "L", ml: "ml", mililitro: "ml", mililitros: "ml" };
/** Maps known unit spellings to un/kg/g/L/ml; unknown units are kept as typed. */
export const normalizeUnit = (unit: string) => {
  const key = unit.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\.$/, "");
  return UNIT_ALIASES[key] ?? (unit.trim() || "un");
};
export const normalizeItemName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function consolidateIngredients(meals: Meal[]) {
  const consolidated = new Map<string, { name: string; amount: number; unit: string }>();
  meals.forEach((meal) => meal.ingredients.forEach((ingredient) => {
    const parsed = ingredient.amount != null && ingredient.unit
      ? { amount: ingredient.amount, unit: ingredient.unit }
      : parseIngredientQuantity(ingredient.qty);
    parsed.unit = normalizeUnit(parsed.unit);
    const key = `${normalizeItemName(ingredient.name)}::${parsed.unit}`;
    const current = consolidated.get(key);
    consolidated.set(key, {
      name: current?.name ?? ingredient.name.replace(/\s+/g, " ").trim(),
      amount: (current?.amount ?? 0) + parsed.amount,
      unit: parsed.unit,
    });
  }));
  return [...consolidated.entries()].map(([id, item]) => ({ id, ...item }));
}

export const formatIngredientAmount = (amount: number, unit: string) =>
  `${amount.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${unit}`;

export const KIND_LABEL: Record<BlockKind, string> = {
  refeicao: "Refeição",
  treino: "Atividade física",
  compromisso: "Compromisso",
  descanso: "Descanso",
};
