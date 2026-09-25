import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brl, consolidateIngredients, formatIngredientAmount } from "@/lib/trilha-data";
import { useTrilha } from "@/lib/trilha-store";
import { getWeekKeys } from "@/lib/calendar-utils";

export const Route = createFileRoute("/compras")({
  head: () => ({ meta: [
    { title: "Compras da semana — Trilha" },
    { name: "description", content: "Lista de compras consolidada a partir das refeições planejadas, com itens pessoais e custo estimado." },
    { property: "og:title", content: "Compras da semana — Trilha" },
    { property: "og:description", content: "Transforme o planejamento alimentar em uma lista prática e sincronizada." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Compras,
});

function Compras() {
  const { plan, getMeal, shoppingItems, setShoppingItems, toggleShoppingItem, addShoppingItem, removeShoppingItem } = useTrilha();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState("un");
  const weekMeals = useMemo(() => getWeekKeys(new Date()).flatMap((key) => plan[key] ?? []).map((block) => getMeal(block.mealId)).filter((meal) => meal != null), [getMeal, plan]);
  const generated = useMemo(() => consolidateIngredients(weekMeals), [weekMeals]);
  const generatedSignature = JSON.stringify(generated);

  useEffect(() => {
    const current = new Map(shoppingItems.map((item) => [item.id, item]));
    const next = [
      ...generated.map((item) => ({ ...item, checked: current.get(item.id)?.checked ?? false })),
      ...shoppingItems.filter((item) => item.manual),
    ];
    if (JSON.stringify(next) !== JSON.stringify(shoppingItems)) setShoppingItems(next);
  }, [generatedSignature]);

  const cost = weekMeals.reduce((sum, meal) => sum + meal.cost, 0);
  const checked = shoppingItems.filter((item) => item.checked).length;

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <section className="pt-8 pb-5"><p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Compras</p><h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Lista consolidada da semana</h1><p className="mt-2 text-sm text-steel">Ingredientes iguais são somados automaticamente. Seus itens pessoais também ficam salvos.</p></section>
      <section className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4"><div><h2 className="font-display text-lg font-semibold">{shoppingItems.length} itens</h2><p className="text-xs text-steel">{checked} colocados no carrinho</p></div><div className="text-right"><p className="text-xs text-steel">Custo estimado das refeições</p><p className="font-display text-2xl font-semibold">{brl(cost)}</p></div></div>
        <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_90px_90px_auto]" onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; addShoppingItem({ name: name.trim(), amount: Math.max(0.01, Number(amount) || 1), unit: unit.trim() || "un" }); setName(""); }}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Adicionar item pessoal" className="h-10 rounded-md bg-background px-3 text-sm ring-1 ring-line" /><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Quantidade" className="h-10 rounded-md bg-background px-3 text-sm ring-1 ring-line" /><input value={unit} onChange={(event) => setUnit(event.target.value)} aria-label="Unidade" className="h-10 rounded-md bg-background px-3 text-sm ring-1 ring-line" /><Button><Plus /> Adicionar</Button></form>
        {shoppingItems.length === 0 ? <div className="mt-6 border-y border-dashed border-line py-10 text-center"><p className="text-sm font-medium">Sua lista está vazia</p><p className="mt-1 text-xs text-steel">Planeje refeições ou acrescente um item pessoal.</p></div> : <ul className="mt-3 divide-y divide-line">{shoppingItems.map((item) => <li key={item.id} className="flex items-center gap-3 py-3"><Button variant={item.checked ? "default" : "outline"} size="icon" className="size-7" onClick={() => toggleShoppingItem(item.id)} aria-label={`${item.name}: ${item.checked ? "retirar" : "colocar"} no carrinho`}>{item.checked ? "✓" : ""}</Button><span className={`flex-1 text-sm ${item.checked ? "text-steel line-through" : ""}`}>{item.name}{item.manual ? <span className="ml-2 text-[10px] text-steel">pessoal</span> : null}</span><span className="text-xs text-steel">{formatIngredientAmount(item.amount, item.unit)}</span>{item.manual ? <Button variant="ghost" size="icon" className="size-7" onClick={() => removeShoppingItem(item.id)} aria-label={`Remover ${item.name}`}><Trash2 /></Button> : null}</li>)}</ul>}
        {checked > 0 && <div className="mt-4 flex justify-end"><Button variant="ghost" size="sm" onClick={() => setShoppingItems(shoppingItems.map((item) => ({ ...item, checked: false })))}><RotateCcw /> Desmarcar tudo</Button></div>}
      </section>
      <p className="mt-4 text-xs leading-5 text-steel">Quantidades e preços são estimativas de planejamento e podem variar. Este recurso não substitui orientação de nutricionista ou médico.</p>
    </main>
  );
}