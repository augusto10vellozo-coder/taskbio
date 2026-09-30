import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarPlus, ChevronLeft, ChevronRight, Plus, ShoppingBasket } from "lucide-react";
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
import { useTrilha } from "@/lib/trilha-store";
import { formatWeekRange, getWeekDates, toDateKey } from "@/lib/calendar-utils";

export const Route = createFileRoute("/alimentacao")({
  head: () => ({ meta: [
    { title: "Planejamento alimentar — Trilha" },
    { name: "description", content: "Escolha refeições para a semana e acompanhe estimativas nutricionais e de custo." },
    { property: "og:title", content: "Planejamento alimentar — Trilha" },
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
};

const toNonNegativeNumber = (value: string) => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

function Alimentacao() {
  const { meals, plan, addBlock, removeBlock, getMeal } = useTrilha();
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [manualOpen, setManualOpen] = useState(false);
  const [manualMeal, setManualMeal] = useState<ManualMealForm>(emptyManualMeal);
  const weekDates = useMemo(() => getWeekDates(referenceDate), [referenceDate]);
  const weekKeys = useMemo(() => weekDates.map(toDateKey), [weekDates]);
  const scheduled = useMemo(() => weekKeys.flatMap((key) => (plan[key] ?? []).filter((block) => block.kind === "refeicao")), [plan, weekKeys]);
  const selectedKey = toDateKey(selectedDate);
  const selectedMeals = (plan[selectedKey] ?? []).filter((block) => block.kind === "refeicao");
  const totals = scheduled.reduce((result, block) => {
    const meal = getMeal(block.mealId);
    const macros = meal?.macros ?? block.manualMeal?.macros;
    if (!macros) return result;
    return {
      kcal: result.kcal + macros.kcal,
      prot: result.prot + macros.prot,
      carb: result.carb + macros.carb,
      gord: result.gord + macros.gord,
      cost: result.cost + (meal?.cost ?? block.manualMeal?.cost ?? 0),
    };
  }, { kcal: 0, prot: 0, carb: 0, gord: 0, cost: 0 });

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
    const name = manualMeal.name.trim();
    const portion = manualMeal.portion.trim();
    if (!name || !portion) {
      toast.error("Informe o alimento e a porção consumida.");
      return;
    }
    addBlock(selectedKey, {
      time: manualMeal.time,
      kind: "refeicao",
      title: name,
      recurrence: "none",
      manualMeal: {
        portion,
        macros: {
          kcal: toNonNegativeNumber(manualMeal.kcal),
          prot: toNonNegativeNumber(manualMeal.prot),
          carb: toNonNegativeNumber(manualMeal.carb),
          gord: toNonNegativeNumber(manualMeal.gord),
        },
        cost: toNonNegativeNumber(manualMeal.cost),
      },
    });
    setManualMeal(emptyManualMeal);
    setManualOpen(false);
    toast.success(`${name} registrado em ${format(selectedDate, "dd/MM")}.`);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <section className="pt-8 pb-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Alimentação</p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><h1 className="font-display text-3xl font-semibold sm:text-4xl">Planeje suas refeições</h1><p className="mt-2 max-w-[62ch] text-sm leading-6 text-steel">Escolha o que deseja preparar em cada dia. Calorias, nutrientes e custos são estimativas para organização.</p></div>
          <Button asChild variant="outline"><Link to="/compras"><ShoppingBasket /> Ver compras</Link></Button>
        </div>
      </section>

      <section className="border-y border-line py-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="icon" onClick={() => { const next = addDays(referenceDate, -7); setReferenceDate(next); setSelectedDate(next); }} aria-label="Semana anterior"><ChevronLeft /></Button>
          <p className="text-sm font-semibold">{formatWeekRange(referenceDate)}</p>
          <Button variant="ghost" size="icon" onClick={() => { const next = addDays(referenceDate, 7); setReferenceDate(next); setSelectedDate(next); }} aria-label="Próxima semana"><ChevronRight /></Button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {weekDates.map((date) => {
            const key = toDateKey(date);
            const count = (plan[key] ?? []).filter((block) => block.kind === "refeicao").length;
            const active = key === selectedKey;
            return <Button key={key} variant={active ? "default" : "outline"} className="h-auto min-w-0 flex-col gap-0 px-1 py-2" onClick={() => setSelectedDate(date)} aria-pressed={active}><span className="text-[10px] uppercase">{format(date, "EEE", { locale: ptBR }).replace(".", "")}</span><span className="font-display text-lg font-semibold">{format(date, "dd")}</span><span className="text-[9px] font-normal">{count ? `${count} ref.` : "vazio"}</span></Button>;
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="font-display text-xl font-semibold">Escolher para {format(selectedDate, "EEEE", { locale: ptBR })}</h2><p className="mt-1 text-xs text-steel">Adicione sugestões ou registre o que você realmente comeu.</p></div><Button type="button" onClick={() => setManualOpen(true)}><Plus /> Registrar o que comi</Button></div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {meals.map((meal) => (
              <article key={meal.id} className="rounded-lg bg-card p-4 ring-1 ring-line">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] uppercase text-steel">{meal.name}</p><h3 className="mt-1 text-base font-semibold">{meal.items}</h3></div><span className="shrink-0 text-sm font-semibold">{brl(meal.cost)}</span></div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-steel"><span>{meal.macros.kcal} kcal</span><span>P {meal.macros.prot}g</span><span>C {meal.macros.carb}g</span><span>G {meal.macros.gord}g</span></div>
                <Button className="mt-4 w-full" size="sm" onClick={() => scheduleMeal(meal.id)}><CalendarPlus /> Adicionar neste dia</Button>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg bg-ink p-5 text-primary-foreground">
            <p className="text-[11px] uppercase text-primary-foreground/70">Resumo da semana</p><p className="mt-2 font-display text-3xl font-semibold">{brl(totals.cost)}</p><p className="mt-1 text-xs text-primary-foreground/70">{scheduled.length} refeições · {totals.kcal.toLocaleString("pt-BR")} kcal</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-primary-foreground/20 pt-4 text-center"><div><dt className="text-[10px] text-primary-foreground/70">Proteína</dt><dd className="mt-1 font-semibold">{totals.prot}g</dd></div><div><dt className="text-[10px] text-primary-foreground/70">Carboidrato</dt><dd className="mt-1 font-semibold">{totals.carb}g</dd></div><div><dt className="text-[10px] text-primary-foreground/70">Gordura</dt><dd className="mt-1 font-semibold">{totals.gord}g</dd></div></dl>
          </section>
          <section className="rounded-lg bg-card p-4 ring-1 ring-line"><h2 className="font-display text-base font-semibold">Neste dia</h2>{selectedMeals.length === 0 ? <p className="mt-3 text-sm text-steel">Nenhuma refeição registrada.</p> : <ul className="mt-3 divide-y divide-line">{selectedMeals.map((block) => { const meal = getMeal(block.mealId); return <li key={block.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{meal?.items ?? block.title}</p>{block.manualMeal ? <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-medium text-steel">registrado</span> : null}</div><p className="mt-0.5 text-xs text-steel">{block.time}{block.manualMeal ? ` · ${block.manualMeal.portion} · ${block.manualMeal.macros.kcal} kcal` : ""}</p></div><Button variant="ghost" size="sm" onClick={() => removeBlock(selectedKey, block.id)}>Remover</Button></li>; })}</ul>}</section>
          <p className="text-xs leading-5 text-steel">Estimativas não substituem avaliação ou orientação de nutricionista ou médico.</p>
        </aside>
      </div>
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-xl">
          <form onSubmit={registerManualMeal}>
            <DialogHeader>
              <DialogTitle>Registrar o que comi</DialogTitle>
              <DialogDescription>Adicione um alimento ou refeição em {format(selectedDate, "dd/MM")}. Os valores nutricionais são opcionais.</DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="manual-meal-name">Alimento ou refeição</Label><Input id="manual-meal-name" className="mt-1.5" value={manualMeal.name} onChange={(event) => setManualMeal((current) => ({ ...current, name: event.target.value }))} maxLength={100} placeholder="Ex.: Arroz, feijão e frango" required /></div>
              <div><Label htmlFor="manual-meal-time">Horário</Label><Input id="manual-meal-time" className="mt-1.5" type="time" value={manualMeal.time} onChange={(event) => setManualMeal((current) => ({ ...current, time: event.target.value }))} required /></div>
              <div><Label htmlFor="manual-meal-portion">Porção consumida</Label><Input id="manual-meal-portion" className="mt-1.5" value={manualMeal.portion} onChange={(event) => setManualMeal((current) => ({ ...current, portion: event.target.value }))} maxLength={60} placeholder="Ex.: 1 prato ou 250 g" required /></div>
              <div><Label htmlFor="manual-meal-kcal">Calorias (kcal)</Label><Input id="manual-meal-kcal" className="mt-1.5" type="number" min="0" max="10000" step="1" inputMode="decimal" value={manualMeal.kcal} onChange={(event) => setManualMeal((current) => ({ ...current, kcal: event.target.value }))} placeholder="Opcional" /></div>
              <div><Label htmlFor="manual-meal-cost">Custo estimado (R$)</Label><Input id="manual-meal-cost" className="mt-1.5" type="number" min="0" max="10000" step="0.01" inputMode="decimal" value={manualMeal.cost} onChange={(event) => setManualMeal((current) => ({ ...current, cost: event.target.value }))} placeholder="Opcional" /></div>
              <div><Label htmlFor="manual-meal-prot">Proteínas (g)</Label><Input id="manual-meal-prot" className="mt-1.5" type="number" min="0" max="1000" step="0.1" inputMode="decimal" value={manualMeal.prot} onChange={(event) => setManualMeal((current) => ({ ...current, prot: event.target.value }))} placeholder="Opcional" /></div>
              <div><Label htmlFor="manual-meal-carb">Carboidratos (g)</Label><Input id="manual-meal-carb" className="mt-1.5" type="number" min="0" max="1000" step="0.1" inputMode="decimal" value={manualMeal.carb} onChange={(event) => setManualMeal((current) => ({ ...current, carb: event.target.value }))} placeholder="Opcional" /></div>
              <div><Label htmlFor="manual-meal-gord">Gorduras (g)</Label><Input id="manual-meal-gord" className="mt-1.5" type="number" min="0" max="1000" step="0.1" inputMode="decimal" value={manualMeal.gord} onChange={(event) => setManualMeal((current) => ({ ...current, gord: event.target.value }))} placeholder="Opcional" /></div>
            </div>
            <p className="mt-4 text-xs leading-5 text-steel">Use valores do rótulo ou uma estimativa. O registro serve para organização e não substitui orientação nutricional.</p>
            <DialogFooter className="mt-5"><Button type="button" variant="outline" onClick={() => setManualOpen(false)}>Cancelar</Button><Button type="submit">Salvar registro</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}