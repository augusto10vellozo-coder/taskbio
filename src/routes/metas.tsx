import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTaskBio } from "@/lib/trilha-store";
import { goalPercent, goalProgress, type MonthGoal } from "@/lib/engagement";

export const Route = createFileRoute("/metas")({
  head: () => ({ meta: [
    { title: "Metas do mês — TaskBio" },
    { name: "description", content: "Crie metas mensais com barra de progresso automática ou manual." },
    { property: "og:title", content: "Metas do mês — TaskBio" },
    { property: "og:description", content: "Acompanhe metas como treinar 12 vezes ou economizar no mês." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Metas,
});

const SOURCES = { manual: "Manual", workouts: "Treinos concluídos (automático)", habits: "Dias com hábitos (automático)" } as const;

function Metas() {
  const { monthGoals, saveMonthGoal, removeMonthGoal, workoutHistory, habitLog, plan } = useTaskBio();
  const [month, setMonth] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("12");
  const [unit, setUnit] = useState("vezes");
  const [source, setSource] = useState<MonthGoal["source"]>("manual");
  useEffect(() => setMonth(format(new Date(), "yyyy-MM")), []);
  if (!month) return <main className="mx-auto max-w-4xl px-5 pt-8"><div className="h-60 animate-pulse rounded-lg bg-mist" /></main>;
  const goals = monthGoals.filter((g) => g.month === month);

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <section className="pt-8 pb-5"><p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Metas</p><h1 className="mt-2 font-display text-3xl font-semibold capitalize sm:text-4xl">{format(new Date(`${month}-01T12:00:00`), "MMMM 'de' yyyy", { locale: ptBR })}</h1><p className="mt-2 text-sm text-steel">Ex.: treinar 12 vezes, ler 2 livros, economizar R$ 200.</p></section>
      <form className="grid gap-2 rounded-lg bg-card p-4 ring-1 ring-line sm:grid-cols-[1fr_80px_100px_1fr_auto]" onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; saveMonthGoal({ id: `g-${Date.now()}`, month, title: title.trim(), target: Math.max(1, Number(target) || 1), unit: unit.trim() || "vezes", source, manual: 0 }); setTitle(""); toast.success("Meta criada"); }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nova meta" className="h-10 rounded-md bg-background px-3 text-sm ring-1 ring-line" />
        <input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Alvo" className="h-10 rounded-md bg-background px-3 text-sm ring-1 ring-line" />
        <input value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unidade" className="h-10 rounded-md bg-background px-3 text-sm ring-1 ring-line" />
        <select value={source} onChange={(e) => setSource(e.target.value as MonthGoal["source"])} aria-label="Como medir" className="h-10 rounded-md bg-background px-2 text-sm ring-1 ring-line">{Object.entries(SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <Button><Plus /> Criar</Button>
      </form>
      <ul className="mt-4 space-y-3">
        {goals.length === 0 && <li className="py-10 text-center text-sm text-steel">Nenhuma meta para este mês ainda.</li>}
        {goals.map((g) => { const v = goalProgress(g, workoutHistory, habitLog, plan); const p = goalPercent(v, g.target); return (
          <li key={g.id} className="rounded-lg bg-card p-4 ring-1 ring-line">
            <div className="flex items-center justify-between gap-2"><div><p className="font-medium">{g.title}</p><p className="text-xs text-steel">{v} de {g.target} {g.unit} · {SOURCES[g.source]}</p></div>
              <div className="flex items-center gap-1">{g.source === "manual" && <><Button variant="outline" size="icon" className="size-8" aria-label="Diminuir" onClick={() => saveMonthGoal({ ...g, manual: Math.max(0, g.manual - 1) })}><Minus /></Button><Button size="icon" className="size-8" aria-label="Aumentar" onClick={() => { saveMonthGoal({ ...g, manual: g.manual + 1 }); if (g.manual + 1 === g.target) toast.success("Meta alcançada!"); }}><Plus /></Button></>}<Button variant="ghost" size="icon" className="size-8" aria-label={`Remover ${g.title}`} onClick={() => { if (window.confirm("Remover esta meta?")) removeMonthGoal(g.id); }}><Trash2 /></Button></div></div>
            <div className="mt-3 h-2.5 rounded-full bg-mist"><div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${p}%` }} /></div>
            <p className="mt-1 text-right text-xs text-steel">{p}%</p>
          </li>); })}
      </ul>
    </main>
  );
}
