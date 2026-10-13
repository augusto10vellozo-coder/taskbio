import { Activity, Dumbbell, CalendarDays, CheckSquare, Droplets, LineChart, ShoppingBasket, Target, UtensilsCrossed, type LucideIcon } from "lucide-react";

export type ModuleId = "agenda" | "treino" | "atividades" | "alimentacao" | "compras" | "progresso" | "habitos" | "metas" | "saude";
export type AppModule = { id: ModuleId; to: "/" | "/treino" | "/atividades" | "/alimentacao" | "/compras" | "/progresso" | "/habitos" | "/metas" | "/saude"; label: string; description: string; icon: LucideIcon; optional: boolean };

/** Registry of app modules. Add new modules here; navigation and settings read from it. */
export const MODULES: AppModule[] = [
  { id: "agenda", to: "/", label: "Minha Agenda", description: "Semana e dia", icon: CalendarDays, optional: false },
  { id: "treino", to: "/treino", label: "Treino", description: "Registro e progressão", icon: Dumbbell, optional: true },
  { id: "atividades", to: "/atividades", label: "Atividades", description: "Treinos", icon: Activity, optional: true },
  { id: "alimentacao", to: "/alimentacao", label: "Alimentação", description: "Refeições", icon: UtensilsCrossed, optional: true },
  { id: "compras", to: "/compras", label: "Compras", description: "Lista da semana", icon: ShoppingBasket, optional: true },
  { id: "progresso", to: "/progresso", label: "Progresso", description: "Evolução", icon: LineChart, optional: true },
  { id: "habitos", to: "/habitos", label: "Hábitos", description: "Tabela semanal", icon: CheckSquare, optional: true },
  { id: "metas", to: "/metas", label: "Metas", description: "Metas do mês", icon: Target, optional: true },
  { id: "saude", to: "/saude", label: "Saúde", description: "Água, sono e peso", icon: Droplets, optional: true },
];

export type ModuleSettings = Partial<Record<ModuleId, boolean>>;
const OFF_BY_DEFAULT: ModuleId[] = ["habitos", "metas", "saude"];

export const isModuleOn = (settings: ModuleSettings, id: ModuleId) => {
  const mod = MODULES.find((m) => m.id === id);
  if (!mod?.optional) return true;
  return settings[id] ?? !OFF_BY_DEFAULT.includes(id);
};
