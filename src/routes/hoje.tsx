import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTaskBio } from "@/lib/trilha-store";
import { formatFullDate, toDateKey } from "@/lib/calendar-utils";
import { DayTimeline } from "@/components/DayTimeline";
import { agendaSummary } from "@/lib/agenda-overview";

export const Route = createFileRoute("/hoje")({
  head: () => ({
    meta: [
      { title: "Hoje — TaskBio" },
      { name: "description", content: "Linha do dia de hoje: refeições, treinos, compromissos e descanso em uma única tela." },
      { property: "og:title", content: "Hoje — TaskBio" },
      { property: "og:description", content: "Acompanhe os itens do seu dia em uma única linha do tempo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Hoje,
});

function Hoje() {
  const { plan } = useTaskBio();
  const [today, setToday] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  useEffect(() => setToday(toDateKey(new Date())), []);

  if (!today) {
    return <main className="mx-auto max-w-3xl px-5 pt-8"><div className="h-60 animate-pulse rounded-lg bg-mist" /></main>;
  }

  const blocks = plan[today] ?? [];
  const summary = agendaSummary(blocks);

  return (
    <main className="mx-auto max-w-3xl px-5 pb-20 sm:px-8">
      <section className="pt-8 pb-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Linha do dia</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Hoje</h1>
        <p className="mt-2 text-sm text-steel">
          {formatFullDate(new Date())} · {summary.total} {summary.total === 1 ? "item" : "itens"} · {summary.completed}{" "}
          {summary.completed === 1 ? "concluído" : "concluídos"}
        </p>
        <div className="mt-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/"><CalendarDays /> Ver a semana completa</Link>
          </Button>
        </div>
      </section>
      <DayTimeline dateKey={today} adding={adding} onAddingChange={setAdding} />
    </main>
  );
}
