import { BookOpen, GraduationCap, Wallet, Dumbbell, CalendarDays, CheckSquare, Droplets, LineChart, ShoppingBasket, Target, UtensilsCrossed, type LucideIcon } from "lucide-react";

export type ModuleId = "agenda" | "treino" | "alimentacao" | "compras" | "progresso" | "habitos" | "metas" | "saude" | "financas" | "leitura" | "estudos";
export type AppModule = { id: ModuleId; to: "/" | "/agenda" | "/treino" | "/alimentacao" | "/compras" | "/progresso" | "/habitos" | "/metas" | "/saude" | "/financas" | "/leitura" | "/estudos"; label: string; description: string; icon: LucideIcon; optional: boolean };

/** Registry of app modules. Add new modules here; navigation and settings read from it. */
export const MODULES: AppModule[] = [
  { id: "agenda", to: "/agenda", label: "Minha Agenda", description: "Semana e dia", icon: CalendarDays, optional: false },
  { id: "treino", to: "/treino", label: "Treino", description: "Registro e progressão", icon: Dumbbell, optional: true },
  { id: "alimentacao", to: "/alimentacao", label: "Alimentação", description: "Refeições", icon: UtensilsCrossed, optional: true },
  { id: "compras", to: "/compras", label: "Compras", description: "Lista da semana", icon: ShoppingBasket, optional: true },
  { id: "progresso", to: "/progresso", label: "Progresso", description: "Evolução", icon: LineChart, optional: true },
  { id: "habitos", to: "/habitos", label: "Hábitos", description: "Tabela semanal", icon: CheckSquare, optional: true },
  { id: "metas", to: "/metas", label: "Metas", description: "Metas do mês", icon: Target, optional: true },
  { id: "saude", to: "/saude", label: "Saúde", description: "Água, sono e medicamentos", icon: Droplets, optional: true },
  { id: "financas", to: "/financas", label: "Finanças", description: "Gastos, contas e orçamento", icon: Wallet, optional: true },
  { id: "leitura", to: "/leitura", label: "Leitura", description: "Minutos e livros", icon: BookOpen, optional: true },
  { id: "estudos", to: "/estudos", label: "Estudos", description: "Sessões de estudo", icon: GraduationCap, optional: true },
];

export type ModuleSettings = Partial<Record<ModuleId, boolean>>;
// Estudos comes enabled: the study routine is the main entry point for the app's current audience.
const OFF_BY_DEFAULT: ModuleId[] = ["metas", "saude", "financas", "leitura"];

export const isModuleOn = (settings: ModuleSettings, id: ModuleId) => {
  const mod = MODULES.find((m) => m.id === id);
  if (!mod?.optional) return true;
  return settings[id] ?? !OFF_BY_DEFAULT.includes(id);
};
