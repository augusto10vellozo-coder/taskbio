import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { addDays, format, parseISO } from "date-fns";
import { CalendarPlus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getWeekKeys } from "@/lib/calendar-utils";
import { useTaskBio } from "@/lib/trilha-store";
import { applyPlannedShopping, plannedShopping, type ShoppingPeriod } from "@/lib/planned-shopping";
import { brl, formatIngredientAmount } from "@/lib/trilha-data";

function weekPeriod(offset = 0): ShoppingPeriod {
  const keys = getWeekKeys(addDays(new Date(), offset));
  return { start: keys[0] ?? "", end: keys[6] ?? "" };
}

export function ShoppingPlanGenerator() {
  const { plan, shoppingItems, setShoppingItems } = useTaskBio();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("current");
  const [period, setPeriod] = useState<ShoppingPeriod>(() => weekPeriod());
  const [preview, setPreview] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [replace, setReplace] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const generated = useMemo(() => plannedShopping(plan, period), [plan, period]);
  const planItems = shoppingItems.filter(item => item.source === "plan");
  const valid = !!period.start && !!period.end && period.start <= period.end;
  function start(update: boolean) {
    const previousPeriod = planItems.find(item => item.planPeriod)?.planPeriod;
    setPeriod(update && previousPeriod ? previousPeriod : weekPeriod());
    setOrigin(update && previousPeriod ? "custom" : "current");
    setPreview(false); setRefresh(update); setReplace(false); setOpen(true);
  }
  function apply() {
    setShoppingItems(applyPlannedShopping(shoppingItems, generated.items, refresh ? "refresh" : replace ? "replace" : "add"));
    setOpen(false);
    toast.success(refresh ? "Itens do plano atualizados. Itens pessoais preservados." : `${generated.items.length} itens do plano adicionados à lista`);
  }
  return <>
    <div className="flex flex-wrap gap-2">
      <Button className="h-auto min-h-11 whitespace-normal" onClick={() => start(false)}><CalendarPlus />Gerar do plano alimentar</Button>
      {planItems.length > 0 && <><Button variant="ghost" size="sm" className="h-auto min-h-11 whitespace-normal" onClick={() => start(true)}><RefreshCw />Atualizar itens do plano</Button><Button variant="ghost" size="sm" className="h-auto min-h-11 whitespace-normal" onClick={() => setRemoveOpen(true)}><Trash2 />Remover itens do plano</Button></>}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>{refresh ? "Atualizar itens do plano" : "Gerar do plano alimentar"}</DialogTitle><DialogDescription>{preview ? "Confira os itens antes de aplicar." : "Escolha o período do seu planejamento."}</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div><Label htmlFor="shopping-origin">Origem</Label><select id="shopping-origin" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={origin} onChange={event => { const value = event.target.value; setOrigin(value); setPreview(false); if (value !== "custom") setPeriod(weekPeriod(value === "next" ? 7 : 0)); }}><option value="current">Semana atual</option><option value="next">Próxima semana</option><option value="custom">Escolher período</option></select></div>
        {origin === "custom" && <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="shopping-start">Data inicial</Label><Input id="shopping-start" type="date" value={period.start} onChange={e => { setPeriod(p => ({ ...p, start: e.target.value })); setPreview(false); }} /></div><div><Label htmlFor="shopping-end">Data final</Label><Input id="shopping-end" type="date" value={period.end} min={period.start} onChange={e => { setPeriod(p => ({ ...p, end: e.target.value })); setPreview(false); }} /></div></div>}
        {!valid ? <p role="alert" className="text-sm text-destructive">Informe um período válido.</p> : <p className="text-sm">{generated.meals} refeições planejadas · {format(parseISO(period.start), "dd/MM/yyyy")} a {format(parseISO(period.end), "dd/MM/yyyy")}</p>}
        {valid && !generated.meals && <div className="space-y-3 border-y border-line py-4"><p className="text-sm text-steel">Não há refeições planejadas nesse período. Planeje sua semana na aba Alimentos para gerar a lista.</p><Button asChild variant="outline"><Link to="/alimentacao">Ir para Alimentos</Link></Button></div>}
        {preview && <>
          {generated.items.length > 0 && <ul className="divide-y divide-line" aria-label="Prévia da lista">{generated.items.map(item => <li key={item.id} className="flex items-start justify-between gap-3 py-3 text-sm"><span className="min-w-0 flex-1 break-words">{item.name}<span className="mt-1 block text-xs text-steel">{item.estimatedCost == null ? "Custo não informado" : brl(item.estimatedCost)}</span></span><span className="shrink-0">{formatIngredientAmount(item.amount, item.unit)}</span></li>)}</ul>}
          {generated.cost > 0 && <p className="text-xs text-steel">Custo estimado das refeições: {brl(generated.cost)}. Custos por alimento não informados.</p>}
          {generated.missing > 0 && <p className="text-xs text-steel">{generated.missing} alimento(s) ou refeição(ões) sem quantidade detalhada não entraram na lista.</p>}
          {refresh ? <p className="text-sm text-steel">Itens pessoais serão mantidos, assim como o carrinho dos itens do plano que não mudaram.</p> : <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Aplicar na lista</legend><label className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="apply-shopping" checked={!replace} onChange={() => setReplace(false)} />Adicionar aos itens existentes</label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="apply-shopping" checked={replace} onChange={() => setReplace(true)} />Substituir a lista</label>{replace && <p className="text-xs text-destructive">Todos os itens atuais, inclusive pessoais, serão substituídos.</p>}</fieldset>}
        </>}
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>{preview ? <Button disabled={!valid || (!generated.items.length && !refresh)} onClick={apply}>Aplicar na lista</Button> : <Button disabled={!valid || (!generated.meals && !refresh)} onClick={() => setPreview(true)}>Ver prévia</Button>}</DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={removeOpen} onOpenChange={setRemoveOpen}><DialogContent><DialogHeader><DialogTitle>Remover itens do plano?</DialogTitle><DialogDescription>Seus itens pessoais serão preservados.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setRemoveOpen(false)}>Cancelar</Button><Button onClick={() => { setShoppingItems(shoppingItems.filter(item => item.source !== "plan")); setRemoveOpen(false); toast.success("Itens do plano removidos"); }}>Remover itens do plano</Button></DialogFooter></DialogContent></Dialog>
  </>;
}