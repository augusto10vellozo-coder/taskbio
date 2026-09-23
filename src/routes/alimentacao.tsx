import { createFileRoute } from "@tanstack/react-router";
import { brl } from "@/lib/trilha-data";
import { useTrilha } from "@/lib/trilha-store";

export const Route = createFileRoute("/alimentacao")({
  head: () => ({ meta: [
    { title: "Alimentação — Trilha" },
    { name: "description", content: "Planeje refeições com receitas, informações nutricionais e custo estimado." },
    { property: "og:title", content: "Alimentação — Trilha" },
    { property: "og:description", content: "Refeições, macros, receitas e economia em um só planejamento." },
  ] }),
  component: Alimentacao,
});

function Alimentacao() {
  const { meals } = useTrilha();
  const total = meals.reduce((sum, meal) => sum + meal.cost, 0);
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <section className="pt-8 pb-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Alimentação</p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Refeições que cabem na rotina e no orçamento</h1>
        <p className="mt-2 max-w-[58ch] text-sm text-steel">Informações estimadas para planejamento. Não substituem orientação de nutricionista ou médico.</p>
      </section>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {meals.map((meal) => (
          <article key={meal.id} className="glass-strong rounded-2xl p-5 ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[11px] uppercase tracking-[0.14em] text-steel">{meal.name}</p><h2 className="mt-1 text-lg font-semibold">{meal.items}</h2></div>
              <span className="shrink-0 text-sm font-semibold">{brl(meal.cost)}</span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[['kcal', meal.macros.kcal], ['prot.', `${meal.macros.prot}g`], ['carb.', `${meal.macros.carb}g`], ['gord.', `${meal.macros.gord}g`]].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-mist py-2"><p className="font-display text-base font-semibold">{value}</p><p className="text-[9px] uppercase text-steel">{label}</p></div>
              ))}
            </div>
            <h3 className="mt-4 text-xs font-semibold uppercase text-steel">Ingredientes</h3>
            <ul className="mt-2 space-y-1.5 text-sm">{meal.ingredients.map((i) => <li key={i.name} className="flex justify-between"><span>{i.name}</span><span className="text-steel">{i.qty}</span></li>)}</ul>
          </article>
        ))}
        <article className="rounded-2xl bg-ink p-5 text-white ring-1 ring-black/5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Resumo</p>
          <p className="mt-2 font-display text-3xl font-semibold">{brl(total)}</p>
          <p className="mt-1 text-sm text-white/70">custo estimado de uma porção de cada receita.</p>
        </article>
      </div>
    </main>
  );
}