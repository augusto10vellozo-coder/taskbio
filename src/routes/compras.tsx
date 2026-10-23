import { ModuleHeader } from "@/components/ModuleHeader";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ShoppingPlanGenerator } from "@/components/ShoppingPlanGenerator";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { brl, formatIngredientAmount, normalizeUnit, SHOPPING_UNITS } from "@/lib/trilha-data";
import { useTaskBio } from "@/lib/trilha-store";
import { plannedShopping } from "@/lib/planned-shopping";
import { getWeekKeys } from "@/lib/calendar-utils";
import { downloadShoppingPdf, shoppingLines } from "@/lib/shopping-export";

export const Route = createFileRoute("/compras")({
  head: () => ({ meta: [
    { title: "Compras da semana — TaskBio" },
    { name: "description", content: "Lista de compras consolidada a partir das refeições planejadas, com itens pessoais e custo estimado." },
    { property: "og:title", content: "Compras da semana — TaskBio" },
    { property: "og:description", content: "Transforme o planejamento alimentar em uma lista prática e sincronizada." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Compras,
});

function Compras() {
  const { plan, shoppingItems, setShoppingItems, toggleShoppingItem, addShoppingItem, removeShoppingItem } = useTaskBio();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<string>("un");
  const nameRef = useRef<HTMLInputElement>(null);
  const weekKeys = getWeekKeys(new Date());
  const period = shoppingItems.find(item => item.source === "plan" && item.planPeriod)?.planPeriod ?? { start: weekKeys[0] ?? "", end: weekKeys[6] ?? "" };
  const cost = plannedShopping(plan, period).cost;
  const checked = shoppingItems.filter((item) => item.checked).length;

  async function copyList() {
    try { await navigator.clipboard.writeText(shoppingLines(shoppingItems, cost).join("\n")); toast.success("Lista copiada para compartilhar."); }
    catch { toast.error("Não foi possível copiar a lista."); }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <ModuleHeader title="Compras" />
      <section className="pb-5"><h2 className="font-display text-lg font-semibold">Lista consolidada da semana</h2><p className="mt-2 text-sm text-steel">Somamos os ingredientes repetidos pra sua lista ficar enxuta.</p></section>
       <div className="mb-4"><ShoppingPlanGenerator /></div>
       <div className="mb-4 flex justify-end" title={shoppingItems.length ? undefined : "Planeje refeições primeiro"}>
         <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" disabled={shoppingItems.length === 0}>Exportar lista</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={copyList}>Copiar como texto</DropdownMenuItem><DropdownMenuItem onSelect={() => { downloadShoppingPdf(shoppingItems, cost).catch(() => toast.error("Não foi possível baixar o PDF.")); }}>Baixar PDF</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
       </div>
       <section className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4"><div><h2 className="font-display text-lg font-semibold">{shoppingItems.length} itens</h2><p className="text-xs text-steel">{checked} colocados no carrinho</p></div><div className="text-right"><p className="text-xs text-steel">Custo estimado das refeições</p><p className="font-display text-2xl font-semibold">{brl(cost)}</p></div></div>
        <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_90px_90px_auto]" onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; addShoppingItem({ name: name.trim(), amount: Math.max(0.01, Number(amount) || 1), unit }); setName(""); }}><input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} placeholder="Adicionar item pessoal" className="h-10 rounded-md bg-background px-3 text-sm ring-1 ring-line" /><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Quantidade" className="h-10 rounded-md bg-background px-3 text-sm ring-1 ring-line" /><select value={unit} onChange={(event) => setUnit(event.target.value)} aria-label="Unidade" className="h-10 rounded-md bg-background px-3 text-sm ring-1 ring-line">{SHOPPING_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select><Button><Plus /> Adicionar</Button></form>
        {shoppingItems.length === 0 ? <div className="mt-6 border-y border-dashed border-line py-10 text-center"><p className="text-sm font-medium">Sua lista está vazia.</p><p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-steel">Gere a partir do seu plano alimentar ou adicione um item.</p><Button variant="outline" className="mt-4 h-11 whitespace-normal" onClick={() => nameRef.current?.focus()}>Adicionar item manual</Button></div> : <ul className="mt-3 divide-y divide-line">{shoppingItems.map((item) => <li key={item.id} className="flex items-center gap-3 py-3"><Button variant={item.checked ? "default" : "outline"} size="icon" className="size-7 shrink-0" onClick={() => toggleShoppingItem(item.id)} aria-label={`${item.name}: ${item.checked ? "retirar" : "colocar"} no carrinho`}>{item.checked ? "✓" : ""}</Button><span className={`min-w-0 flex-1 break-words text-sm ${item.checked ? "text-steel line-through" : ""}`}>{item.name}{item.manual ? <span className="ml-2 text-[10px] text-steel">pessoal</span> : item.source === "plan" ? <span className="ml-2 text-[10px] text-steel">do plano</span> : null}</span><span className="shrink-0 text-xs text-steel">{formatIngredientAmount(item.amount, normalizeUnit(item.unit))}</span>{item.manual || item.source === "plan" ? <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => removeShoppingItem(item.id)} aria-label={`Remover ${item.name}`}><Trash2 /></Button> : null}</li>)}</ul>}
        {checked > 0 && <div className="mt-4 flex justify-end"><Button variant="ghost" size="sm" onClick={() => setShoppingItems(shoppingItems.map((item) => ({ ...item, checked: false })))}><RotateCcw /> Desmarcar tudo</Button></div>}
      </section>
      <p className="mt-4 text-xs leading-5 text-steel">Valores estimados. Registros pessoais não substituem orientação de profissional.</p>
    </main>
  );
}