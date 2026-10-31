import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, Settings2, Snowflake, Users, type LucideIcon } from "lucide-react";
import { MODULES, isModuleOn, type ModuleId } from "@/lib/modules";
import { useTaskBio } from "@/lib/trilha-store";
import { useAuth } from "@/lib/auth-context";
import { useHabitFreezes } from "@/lib/use-habit-freezes";
import { getWeekDates, toDateKey } from "@/lib/calendar-utils";

export const Route = createFileRoute("/rotina")({
  head: () => ({
    meta: [
      { title: "Rotina — TaskBio" },
      { name: "description", content: "Todos os seus módulos em um só lugar: corpo, mente e casa." },
      { property: "og:title", content: "Rotina — TaskBio" },
      { property: "og:description", content: "Acesse treino, alimentação, hábitos, leitura, estudos, compras e finanças." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Rotina,
});

type RotinaCard = { id: string; to: string; label: string; icon: LucideIcon; context: string };

function Rotina() {
  const { modules, workouts, habits, shoppingItems, trackers, plan, ready } = useTaskBio();
  const { user } = useAuth();
  const freezeQuery = useHabitFreezes();

  const weekKeys = getWeekDates(new Date()).map(toDateKey);
  const plannedMeals = weekKeys.flatMap((key) => plan[key] ?? []).filter((b) => b.kind === "refeicao").length;
  const todayCommitments = (plan[toDateKey(new Date())] ?? []).filter((b) => b.kind === "compromisso").length;
  const books = trackers.books ?? [];

  const contextFor = (id: ModuleId): string => {
    const mod = MODULES.find((m) => m.id === id);
    const fallback = mod?.description ?? "";
    switch (id) {
      case "treino": {
        const w = workouts[0];
        return w ? `${w.name}${w.focus ? ` · ${w.focus}` : ""}` : fallback;
      }
      case "alimentacao":
        return plannedMeals > 0 ? `${plannedMeals} ${plannedMeals === 1 ? "refeição planejada" : "refeições planejadas"} na semana` : fallback;
      case "leitura":
        return books.length > 0 ? `${books.length} ${books.length === 1 ? "livro" : "livros"} na estante` : fallback;
      case "habitos":
        return habits.length > 0 ? `${habits.length} ${habits.length === 1 ? "hábito ativo" : "hábitos ativos"}` : fallback;
      case "compras":
        return shoppingItems.length > 0 ? `${shoppingItems.length} ${shoppingItems.length === 1 ? "item" : "itens"} na lista` : fallback;
      default:
        return fallback;
    }
  };

  const moduleCard = (id: ModuleId): RotinaCard | null => {
    if (!isModuleOn(modules, id)) return null;
    const mod = MODULES.find((m) => m.id === id);
    if (!mod) return null;
    return { id: mod.id, to: mod.to, label: mod.label, icon: mod.icon, context: contextFor(id) };
  };

  const groups: Array<{ title: string; cards: RotinaCard[] }> = [
    { title: "Corpo", cards: (["treino", "alimentacao", "saude"] as ModuleId[]).map(moduleCard).filter((c): c is RotinaCard => c != null) },
    { title: "Mente", cards: (["leitura", "estudos", "habitos"] as ModuleId[]).map(moduleCard).filter((c): c is RotinaCard => c != null) },
    {
      title: "Casa",
      cards: [
        ...(["compras", "financas"] as ModuleId[]).map(moduleCard).filter((c): c is RotinaCard => c != null),
        { id: "compromissos", to: "/agenda", label: "Compromissos", icon: CalendarDays, context: todayCommitments > 0 ? `${todayCommitments} ${todayCommitments === 1 ? "compromisso" : "compromissos"} hoje` : "Agenda da semana" },
      ],
    },
  ];

  const freezes = freezeQuery.data?.balance;

  if (!ready) {
    return <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8"><div className="h-48 animate-pulse rounded-2xl bg-mist" /></main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 sm:px-8">
      <h1 className="pt-6 text-2xl font-semibold text-ink">Rotina</h1>

      {user && freezes != null && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
          <Snowflake className="size-5 shrink-0 text-accent" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink">{freezes} {freezes === 1 ? "congelamento" : "congelamentos"}</p>
            <p className="text-[13px] text-steel">Ganhe 1 a cada 10 hábitos concluídos</p>
          </div>
        </div>
      )}

      {groups.map((group) => group.cards.length > 0 && (
        <section key={group.title} className="mt-6" aria-label={group.title}>
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">{group.title}</h2>
          <div className="mt-2.5 space-y-2.5">
            {group.cards.map((card) => (
              <Link key={card.id} to={card.to} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
                <card.icon className="size-5 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ink">{card.label}</p>
                  <p className="truncate text-[13px] text-steel">{card.context}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      ))}

      <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-[13px] font-medium text-steel">
        {user && <Link to="/amigos" className="inline-flex items-center gap-1.5 hover:text-ink"><Users className="size-4" aria-hidden="true" /> Amigos</Link>}
        <Link to="/modulos" className="inline-flex items-center gap-1.5 hover:text-ink"><Settings2 className="size-4" aria-hidden="true" /> Módulos ativáveis</Link>
      </div>
    </main>
  );
}
