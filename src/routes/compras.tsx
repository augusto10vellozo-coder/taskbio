import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DAYS, brl } from "@/lib/trilha-data";
import { useTrilha } from "@/lib/trilha-store";

export const Route = createFileRoute("/compras")({
  head: () => ({ meta: [
    { title: "Compras da semana — Trilha" },
    { name: "description", content: "Lista de compras gerada a partir das refeições planejadas, com quantidades e custo semanal estimado." },
    { property: "og:title", content: "Compras da semana — Trilha" },
    { property: "og:description", content: "Transforme o planejamento alimentar em uma lista de compras prática." },
  ] }),
  component: Compras,
});

function Compras() {
  const { plan, getMeal } = useTrilha();
  const [checked, setChecked] = useState<string[]>([]);
  const data = useMemo(() => {
    const items = new Map<string, string[]>(); let cost = 0;
    DAYS.flatMap((d) => plan[d.key]).forEach((b) => { const meal = getMeal(b.mealId); if (!meal) return; cost += meal.cost; meal.ingredients.forEach((i) => items.set(i.name, [...(items.get(i.name) ?? []), i.qty])); });
    return { items: [...items.entries()], cost };
  }, [plan, getMeal]);
  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <section className="pt-8 pb-4"><p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Compras</p><h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Lista da semana</h1><p className="mt-2 text-sm text-steel">Gerada automaticamente pelas refeições da sua agenda.</p></section>
      <section className="glass-strong rounded-2xl p-5 ring-1 ring-black/5 sm:p-6">
        <div className="flex items-center justify-between border-b border-line pb-4"><div><h2 className="font-display text-lg font-semibold">{data.items.length} itens</h2><p className="text-xs text-steel">{checked.length} colocados no carrinho</p></div><div className="text-right"><p className="text-xs text-steel">Custo estimado</p><p className="font-display text-2xl font-semibold">{brl(data.cost)}</p></div></div>
        <ul className="mt-2 divide-y divide-line">{data.items.map(([name, quantities]) => { const done = checked.includes(name); return <li key={name} className="flex items-center gap-3 py-3"><button onClick={() => setChecked((s) => done ? s.filter((x) => x !== name) : [...s, name])} className={`grid size-5 place-items-center rounded-md text-xs ring-1 ${done ? 'bg-good text-white ring-good' : 'bg-white text-steel ring-line'}`}>{done ? '✓' : ''}</button><span className={`flex-1 text-sm ${done ? 'text-steel line-through' : ''}`}>{name}</span><span className="text-xs text-steel">{quantities.length} porções · {quantities[0]}</span></li>; })}</ul>
      </section>
    </main>
  );
}