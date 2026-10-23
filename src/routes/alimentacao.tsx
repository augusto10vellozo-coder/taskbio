import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MealPlanningShortcuts } from "@/components/MealPlanningShortcuts";
import { makePlannedMeal, mealsForMode, mealsForTotals, predictedMeal, nextMealDate, mealTypes, type MealMode } from "@/lib/meal-planning";
import { ModuleHeader } from "@/components/ModuleHeader";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarPlus, ChevronLeft, ChevronRight, Plus, ArrowRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl } from "@/lib/trilha-data";
import { useTaskBio } from "@/lib/trilha-store";
import { foodName, mealItemsTotal, mealNutrition, mealSummary } from "@/lib/meal-summary";
import { MealItemPicker, type MealItem } from "@/components/MealItemPicker";
import type { Block } from "@/lib/trilha-data";
import { formatWeekRange, getWeekDates, toDateKey } from "@/lib/calendar-utils";

export const Route = createFileRoute("/alimentacao")({
  head: () => ({ meta: [
    { title: "Planejamento alimentar — TaskBio" },
    { name: "description", content: "Escolha refeições para a semana e acompanhe estimativas nutricionais e de custo." },
    { property: "og:title", content: "Planejamento alimentar — TaskBio" },
    { property: "og:description", content: "Planeje refeições e transforme suas escolhas em uma lista de compras." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Alimentacao,
});

const defaultTimes: Record<string, string> = {
  "Café da manhã": "07:00",
  Almoço: "12:30",
  "Lanche da tarde": "16:00",
  Jantar: "20:00",
  "Café reforçado": "08:00",
};

type ManualMealForm = {
  name: string;
  time: string;
  portion: string;
  kcal: string;
  prot: string;
  carb: string;
  gord: string;
  cost: string;
  items: MealItem[];
};

const emptyManualMeal: ManualMealForm = {
  name: "",
  time: "12:00",
  portion: "",
  kcal: "",
  prot: "",
  carb: "",
  gord: "",
  cost: "",
  items: [],
};

const toNonNegativeNumber = (value: string) => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

function Alimentacao() {
  const { meals, plan, addBlock, registerMeal, removeBlock, getMeal, customFoods, addCustomFood, savePlannedMeal, consumeMeal, skipMeal } = useTaskBio();
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [mode, setMode] = useState<MealMode>("planejar");
  const [formMode, setFormMode] = useState<MealMode>("registrar");
  const [mealType, setMealType] = useState<(typeof mealTypes)[number]>("Almoço");
  const [repeatOffer, setRepeatOffer] = useState<{ date: string; title: string; time: string; food: NonNullable<Block["manualMeal"]> } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Block | null>(null);
  const [manualMeal, setManualMeal] = useState<ManualMealForm>(emptyManualMeal);
  const weekDates = useMemo(() => getWeekDates(referenceDate), [referenceDate]);
  const weekKeys = useMemo(() => weekDates.map(toDateKey), [weekDates]);
  const scheduled = useMemo(() => weekKeys.flatMap((key) => (plan[key] ?? []).filter((block) => block.kind === "refeicao")), [plan, weekKeys]);
  const selectedKey = toDateKey(selectedDate);
  const selectedMeals = (plan[selectedKey] ?? []).filter((block) => block.kind === "refeicao");
  const visibleMeals = mealsForMode(selectedMeals, mode);
  const totals = mealSummary(mealsForTotals(scheduled, mode), getMeal);
  const dayTotals = mealSummary(mealsForTotals(selectedMeals, mode), getMeal);
  const predicted = mealSummary(mealsForTotals(selectedMeals, "planejar"), getMeal);
  const real = mealSummary(mealsForTotals(selectedMeals, "registrar"), getMeal);
  const fmt = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  function editMeal(source: Block) {
    const block = mode === "planejar" && source.plannedMeal?.state === "planejada" ? predictedMeal(source) : source;
    setFormMode(source.plannedMeal?.state === "planejada" ? "planejar" : "registrar");
    setMealType(source.plannedMeal?.type ?? "Almoço");
    const nutrition = mealNutrition(block, getMeal);
    setEditingMeal(block);
    setManualMeal({ name: block.title, time: block.time, portion: block.manualMeal?.portion ?? "",
      kcal: nutrition.known ? String(nutrition.kcal) : "", prot: nutrition.known ? String(nutrition.prot) : "",
      carb: nutrition.known ? String(nutrition.carb) : "", gord: nutrition.known ? String(nutrition.gord) : "", cost: String(nutrition.cost), items: block.manualMeal?.items ?? [], ...(block.manualMeal?.items?.length ? { kcal: block.manualMeal.kcalOverride ? String(block.manualMeal.kcalOverride) : "" } : {}) });
    setManualOpen(true);
  }

  function scheduleMeal(mealId: string) {
    const meal = getMeal(mealId);
    if (!meal) return;
    addBlock(selectedKey, {
      time: defaultTimes[meal.name] ?? "12:00",
      kind: "refeicao",
      title: meal.name,
      mealId: meal.id,
      recurrence: "none",
    });
    toast.success(`${meal.name} adicionada em ${format(selectedDate, "dd/MM")}.`);
  }

  function registerManualMeal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = formMode === "planejar" ? mealType : foodName(manualMeal.name.trim());
    const items = manualMeal.items;
    const portion = items.length ? items.map((i) => `${i.name} ${i.portion}`).join("; ").slice(0, 300) : manualMeal.portion.trim();
    if (formMode === "planejar" && !items.length) { toast.error("Adicione ao menos um alimento para planejar."); return; }
    if (!name || !portion) {
      toast.error(items.length ? "Dê um nome à refeição." : "Informe a refeição e adicione ao menos um alimento ou a porção.");
      return;
    }
    const kcalOverride = toNonNegativeNumber(manualMeal.kcal) || undefined;
    const payload: Omit<Block, "id" | "done"> = {
      ...(editingMeal ?? {}),
      time: manualMeal.time,
      kind: "refeicao",
      title: name,
      recurrence: "none",
      manualMeal: {
        portion,
        ...(items.length ? { items, kcalOverride } : { items: undefined, kcalOverride: undefined }),
        macros: items.length ? mealItemsTotal(items, kcalOverride) : {
          kcal: toNonNegativeNumber(manualMeal.kcal),
          prot: toNonNegativeNumber(manualMeal.prot),
          carb: toNonNegativeNumber(manualMeal.carb),
          gord: toNonNegativeNumber(manualMeal.gord),
        },
        cost: toNonNegativeNumber(manualMeal.cost),
      },
    };
    if (formMode === "planejar" && payload.manualMeal) {
      savePlannedMeal(selectedKey, makePlannedMeal(editingMeal?.id ?? `p-${crypto.randomUUID()}`, mealType, name, manualMeal.time, payload.manualMeal));
    } else {
      registerMeal(selectedKey, payload, editingMeal?.id);
      if (!editingMeal && payload.manualMeal) setRepeatOffer({ date: selectedKey, title: name, time: manualMeal.time, food: structuredClone(payload.manualMeal) });
    }
    setEditingMeal(null);
    setManualMeal(emptyManualMeal);
    setManualOpen(false);
    toast.success(`${name} ${formMode === "planejar" ? "planejado" : "registrado"} em ${format(selectedDate, "dd/MM")}.`);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <ModuleHeader title="Alimentação" /><section className="pb-5">
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><h2 className="font-display text-lg font-semibold">Planeje suas refeições</h2><p className="mt-2 max-w-[62ch] text-sm leading-6 text-steel">Escolha o que vai preparar em cada dia. Valores estimados.</p></div>
        </div>
      </section>

      <Tabs value={mode} onValueChange={value => setMode(value as MealMode)} className="mb-4">
        <TabsList aria-label="Modo de alimentação"><TabsTrigger value="planejar">Planejar</TabsTrigger><TabsTrigger value="registrar">Registrar</TabsTrigger></TabsList>
      </Tabs>
      {mode === "planejar" && <div className="mb-4"><MealPlanningShortcuts kind="week" date={selectedKey} weekKeys={weekKeys} /></div>}
      <section className="border-y border-line py-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="icon" onClick={() => { const next = addDays(referenceDate, -7); setReferenceDate(next); setSelectedDate(next); }} aria-label="Semana anterior"><ChevronLeft /></Button>
          <p className="text-sm font-semibold">{formatWeekRange(referenceDate)}</p>
          <Button variant="ghost" size="icon" onClick={() => { const next = addDays(referenceDate, 7); setReferenceDate(next); setSelectedDate(next); }} aria-label="Próxima semana"><ChevronRight /></Button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {weekDates.map((date) => {
            const key = toDateKey(date);
            const count = mealsForMode(plan[key] ?? [], mode).length;
            const active = key === selectedKey;
            return <Button key={key} variant={active ? "default" : "outline"} className="h-auto min-w-0 flex-col gap-0 px-1 py-2" onClick={() => setSelectedDate(date)} aria-pressed={active}><span className="text-[10px] uppercase">{format(date, "EEE", { locale: ptBR }).replace(".", "")}</span><span className="font-display text-lg font-semibold">{format(date, "dd")}</span><span className="text-[9px] font-normal">{count ? (mode === "planejar" ? "• plano" : `${count} ref.`) : "vazio"}</span></Button>;
          })}
        </div>
      </section>

      <section className="py-6" aria-label="Refeições do dia">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="font-display text-xl font-semibold">Refeições de {format(selectedDate, "EEEE", { locale: ptBR })}</h2>
          <Button type="button" onClick={() => { setEditingMeal(null); setFormMode(mode); setMealType("Almoço"); setManualMeal(emptyManualMeal); setManualOpen(true); }}><Plus /> {mode === "planejar" ? "Planejar refeição" : "Registrar o que comi"}</Button>
        </div>
        {mode === "planejar" && <div className="mt-3"><MealPlanningShortcuts kind="day" date={selectedKey} weekKeys={weekKeys} /></div>}
        <div className="mt-4 border-y border-line py-4">
          <h3 className="text-xs font-medium text-steel">Resumo do dia{mode === "planejar" ? " · previsto" : " · registrado"}</h3>
          <p className="mt-1 font-display text-2xl font-semibold">{dayTotals.known ? `${fmt(dayTotals.kcal)} kcal${mode === "planejar" ? " previstas" : ""}` : "Calorias não informadas"}</p>
          <p className="mt-1 text-xs text-steel">{dayTotals.known ? `P ${fmt(dayTotals.prot)}g · C ${fmt(dayTotals.carb)}g · G ${fmt(dayTotals.gord)}g` : "Nutrientes não informados"}{dayTotals.cost > 0 ? ` · ${brl(dayTotals.cost)}` : ""}</p>
        </div>
        {mode === "registrar" && selectedMeals.some(b => b.plannedMeal) && <p className="mt-3 text-xs text-steel">Previsto: {fmt(predicted.kcal)} kcal · Registrado: {fmt(real.kcal)} kcal</p>}
        {mode === "registrar" && repeatOffer && <div className="my-4 border-y border-line py-3"><p className="text-sm">Quer incluir essa refeição no seu planejamento?</p><div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => {
          const date = nextMealDate(repeatOffer.date, toDateKey(new Date()));
          const type = mealTypes.find(t => t === repeatOffer.title) ?? "Lanche";
          savePlannedMeal(date, makePlannedMeal(`p-${crypto.randomUUID()}`, type, repeatOffer.title, repeatOffer.time, repeatOffer.food));
          setRepeatOffer(null); toast.success(`Refeição planejada em ${format(new Date(`${date}T12:00:00`), "dd/MM")}.`);
        }}>Repetir nas próximas semanas</Button><Button variant="ghost" size="sm" onClick={() => setRepeatOffer(null)}>Agora não</Button></div></div>}
        {visibleMeals.length === 0 ? <p className="py-5 text-sm text-steel">{mode === "planejar" ? "Planeje sua primeira refeição neste dia." : "Registre sua primeira refeição neste dia."}</p> :
          <ul className="divide-y divide-line">{visibleMeals.map((block) => {
            const meal = getMeal(block.mealId);
            const shown = mode === "planejar" ? predictedMeal(block) : block;
            const nutrition = mealNutrition(shown, getMeal);
            return <li key={block.id} className="flex flex-col items-stretch justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-sm font-medium">{foodName(block.manualMeal ? block.title : meal?.items ?? block.title)}</h3>{(block.manualMeal || block.plannedMeal) && <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-medium text-steel">{block.plannedMeal?.state ?? "registrado"}</span>}</div>
                <p className="mt-1 text-xs leading-5 text-steel">{shown.time}{shown.manualMeal ? ` · ${shown.manualMeal.portion}` : ""}{nutrition.known ? ` · ${fmt(nutrition.kcal)} kcal` : ""}</p>
                {!block.manualMeal && !block.plannedMeal && <p className="mt-1 text-xs text-steel">Refeição a registrar</p>}
              </div>
              <div className="flex flex-wrap gap-1">
                {mode === "planejar" && block.plannedMeal && <MealPlanningShortcuts kind="meal" blockId={block.id} date={selectedKey} weekKeys={weekKeys} />}
                {mode === "planejar" && block.plannedMeal?.state === "planejada" && <><Button size="sm" onClick={() => consumeMeal(selectedKey, block.id)}>Comi isso</Button><Button size="sm" variant="ghost" onClick={() => skipMeal(selectedKey, block.id)}>Pulei esta refeição</Button></>}
                {block.plannedMeal?.state !== "pulada" && <Button variant={block.manualMeal ? "ghost" : "outline"} size="sm" onClick={() => editMeal(block)}>{block.plannedMeal?.state === "consumida" ? "Editar o que comi de verdade" : block.plannedMeal ? "Editar plano" : block.manualMeal ? "Editar" : "Registrar alimentos"}</Button>}<Button variant="ghost" size="sm" onClick={() => removeBlock(selectedKey, block.id)}>Remover</Button></div>
            </li>;
          })}</ul>}
      </section>
      <section className="border-y border-line py-4" aria-label="Resumo da semana">
        <h2 className="font-display text-base font-semibold">Resumo da semana · {mode === "planejar" ? "previsto" : "registrado"}</h2>
        <p className="mt-2 text-sm">{mealsForTotals(scheduled, mode).length} refeições · {totals.known ? `${fmt(totals.kcal)} kcal` : "Calorias não informadas"}{totals.cost > 0 ? ` · ${brl(totals.cost)}` : ""}</p>
        {totals.known > 0 && <p className="mt-1 text-xs text-steel">P {fmt(totals.prot)}g · C {fmt(totals.carb)}g · G {fmt(totals.gord)}g</p>}
        {totals.missing > 0 && <p className="mt-2 text-xs text-steel">{totals.missing} refeição(ões) sem valores nutricionais informados.</p>}
      </section>
      {mode === "registrar" && <details className="group border-b border-line py-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-display text-base font-semibold">Sugestões<ChevronDown className="size-4 transition-transform group-open:rotate-180" /></summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meals.map((meal) => <article key={meal.id} className="rounded-lg bg-card p-4 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] uppercase text-steel">{meal.name}</p><h3 className="mt-1 break-words text-base font-semibold">{meal.items}</h3></div><span className="shrink-0 text-sm font-semibold">{brl(meal.cost)}</span></div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-steel"><span>{meal.macros.kcal} kcal</span><span>P {meal.macros.prot}g</span><span>C {meal.macros.carb}g</span><span>G {meal.macros.gord}g</span></div>
            <Button className="mt-4 w-full" size="sm" onClick={() => scheduleMeal(meal.id)}><CalendarPlus /> Adicionar neste dia</Button>
          </article>)}
        </div>
      </details>}
      <div className="flex flex-wrap items-center justify-between gap-3 py-5">
        <p className="text-xs leading-5 text-steel">Registros pessoais. Não substituem orientação de profissional.</p>
        <Button asChild variant="link" size="sm"><Link to="/compras">Lista da semana <ArrowRight className="size-4" /></Link></Button>
      </div>
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-xl">
          <form onSubmit={registerManualMeal}>
            <DialogHeader>
              <DialogTitle>{formMode === "planejar" ? "Planejar refeição" : editingMeal?.plannedMeal ? "Editar o que comi de verdade" : editingMeal ? "Registrar alimentos" : "Registrar o que comi"}</DialogTitle>
              <DialogDescription>Adicione um alimento ou refeição em {format(selectedDate, "dd/MM")}. Os valores nutricionais são opcionais.</DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {formMode === "planejar" ? <div className="sm:col-span-2"><Label htmlFor="planned-meal-type">Tipo de refeição</Label><select id="planned-meal-type" className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={mealType} onChange={event => setMealType(event.target.value as typeof mealType)}>{mealTypes.map(type => <option key={type}>{type}</option>)}</select></div> : <div className="sm:col-span-2"><Label htmlFor="manual-meal-name">Nome da refeição</Label><Input id="manual-meal-name" className="mt-1.5" value={manualMeal.name} onChange={(event) => setManualMeal((current) => ({ ...current, name: event.target.value }))} maxLength={100} placeholder="Ex.: Almoço" required /></div>}
              <div><Label htmlFor="manual-meal-time">Horário</Label><Input id="manual-meal-time" className="mt-1.5" type="time" value={manualMeal.time} onChange={(event) => setManualMeal((current) => ({ ...current, time: event.target.value }))} required /></div>
              <div><Label htmlFor="manual-meal-cost">Custo estimado (R$)</Label><Input id="manual-meal-cost" className="mt-1.5" type="number" min="0" max="10000" step="0.1" inputMode="decimal" value={manualMeal.cost} onChange={(event) => setManualMeal((current) => ({ ...current, cost: event.target.value }))} placeholder="Opcional" /></div>
              <div className="sm:col-span-2"><MealItemPicker customFoods={customFoods ?? []} onCreateFood={(food) => { addCustomFood(food); toast.success(`${food.name} salvo nos seus alimentos.`); }} onAdd={(item) => setManualMeal((current) => ({ ...current, items: [...current.items, item], name: formMode === "planejar" ? current.name : current.name || item.name }))} /></div>
              {manualMeal.items.length > 0 ? <div className="sm:col-span-2">
                <ul className="divide-y divide-line rounded-md ring-1 ring-line">{manualMeal.items.map((item, index) => <li key={index} className="flex items-center justify-between gap-2 px-3 py-2 text-sm"><div className="min-w-0"><p className="font-medium">{item.name}</p><p className="text-xs text-steel">{item.portion} · {item.macros.kcal} kcal · P {fmt(item.macros.prot)}g · C {fmt(item.macros.carb)}g · G {fmt(item.macros.gord)}g</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setManualMeal((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }))}>Remover</Button></li>)}</ul>
                {(() => { const t = mealItemsTotal(manualMeal.items, toNonNegativeNumber(manualMeal.kcal) || undefined); return <p className="mt-2 text-sm font-semibold">Total: {fmt(t.kcal)} kcal · P {fmt(t.prot)}g · C {fmt(t.carb)}g · G {fmt(t.gord)}g</p>; })()}
                <div className="mt-3"><Label htmlFor="manual-meal-kcal">Kcal total (opcional)</Label><Input id="manual-meal-kcal" className="mt-1.5" type="number" min="0" max="10000" step="1" inputMode="decimal" value={manualMeal.kcal} onChange={(event) => setManualMeal((current) => ({ ...current, kcal: event.target.value }))} placeholder="Se preenchido, substitui a soma dos itens" /></div>
              </div> : formMode === "registrar" ? <>
                <div className="sm:col-span-2"><Label htmlFor="manual-meal-portion">Ou descreva a porção sem a base</Label><Input id="manual-meal-portion" className="mt-1.5" value={manualMeal.portion} onChange={(event) => setManualMeal((current) => ({ ...current, portion: event.target.value }))} maxLength={60} placeholder="Ex.: 1 prato" /></div>
                <div><Label htmlFor="manual-meal-kcal">Calorias (kcal)</Label><Input id="manual-meal-kcal" className="mt-1.5" type="number" min="0" max="10000" step="0.1" inputMode="decimal" value={manualMeal.kcal} onChange={(event) => setManualMeal((current) => ({ ...current, kcal: event.target.value }))} placeholder="Opcional" /></div><div><Label htmlFor="manual-meal-prot">Proteínas (g)</Label><Input id="manual-meal-prot" className="mt-1.5" type="number" min="0" max="10000" step="0.1" inputMode="decimal" value={manualMeal.prot} onChange={(event) => setManualMeal((current) => ({ ...current, prot: event.target.value }))} placeholder="Opcional" /></div><div><Label htmlFor="manual-meal-carb">Carboidratos (g)</Label><Input id="manual-meal-carb" className="mt-1.5" type="number" min="0" max="10000" step="0.1" inputMode="decimal" value={manualMeal.carb} onChange={(event) => setManualMeal((current) => ({ ...current, carb: event.target.value }))} placeholder="Opcional" /></div><div><Label htmlFor="manual-meal-gord">Gorduras (g)</Label><Input id="manual-meal-gord" className="mt-1.5" type="number" min="0" max="10000" step="0.1" inputMode="decimal" value={manualMeal.gord} onChange={(event) => setManualMeal((current) => ({ ...current, gord: event.target.value }))} placeholder="Opcional" /></div>
              </> : null}
            </div>
            <p className="mt-4 text-xs leading-5 text-steel">Use os valores do rótulo ou uma estimativa.</p>
            <DialogFooter className="mt-5"><Button type="button" variant="outline" onClick={() => setManualOpen(false)}>Cancelar</Button><Button type="submit">{formMode === "planejar" ? "Salvar planejamento" : "Salvar registro"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}