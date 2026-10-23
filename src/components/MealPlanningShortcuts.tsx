import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";

type Props = { weekKeys: string[]; date: string; blockId?: string; kind: "week" | "day" | "meal" };

export function MealPlanningShortcuts({ weekKeys, date, blockId, kind }: Props) {
  const { plan, repeatMeals, repeatPreviousMealWeek } = useTaskBio();
  const [open, setOpen] = useState(false);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [replace, setReplace] = useState(false);
  const source = (plan[date] ?? []).filter(b => b.plannedMeal && (!blockId || b.id === blockId));
  const previousKeys = weekKeys.map(key => toDateKey(addDays(parseISO(key), -7)));
  const previousCount = previousKeys.reduce((sum, key) => sum + (plan[key] ?? []).filter(b => b.plannedMeal).length, 0);
  const existing = weekKeys.some(key => (plan[key] ?? []).some(b => b.plannedMeal));
  const occupied = destinations.filter(key => (plan[key] ?? []).some(b => b.plannedMeal)).length;
  function apply() {
    if (kind === "week") {
      repeatPreviousMealWeek(weekKeys, replace);
      toast.success(`${previousCount} refeições copiadas da semana anterior`);
    } else {
      repeatMeals(date, destinations, blockId);
      toast.success(kind === "meal" ? `Refeição repetida em ${destinations.length} dias` : `${source.length} refeições copiadas para ${destinations.length} dias`);
    }
    setOpen(false);
  }
  return <>
    <Button size="sm" variant="outline" disabled={kind !== "week" && !source.length} onClick={() => { setDestinations([]); setReplace(false); setOpen(true); }}>
      {kind === "week" ? <CalendarDays /> : <Copy />}{kind === "week" ? "Repetir semana anterior" : kind === "day" ? "Copiar este dia para..." : "Repetir em outros dias"}
    </Button>
    {kind === "meal" && <Button size="sm" variant="ghost" onClick={() => { repeatMeals(date, [date], blockId); toast.success("Refeição duplicada neste dia"); }}><Copy /> Duplicar</Button>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
      <DialogHeader><DialogTitle>{kind === "week" ? "Repetir semana anterior" : kind === "day" ? "Copiar este dia para..." : "Repetir em outros dias"}</DialogTitle>
        <DialogDescription>{kind === "week" ? previousCount ? `Copiar ${previousCount} refeições da semana de ${format(parseISO(previousKeys[0] ?? date), "dd/MM")} para esta semana?` : "Não há refeições planejadas na semana anterior." : "Escolha os dias desta semana."}</DialogDescription></DialogHeader>
      {kind === "week" ? existing && previousCount > 0 && <fieldset className="space-y-3"><legend className="mb-3 text-sm">Esta semana já tem refeições planejadas.</legend>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="copy-week" checked={!replace} onChange={() => setReplace(false)} />Adicionar às existentes</label>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="copy-week" checked={replace} onChange={() => setReplace(true)} />Substituir</label>
        {replace && <p className="text-xs text-steel">Só o planejamento desta semana será substituído. Registros avulsos e demais compromissos serão mantidos.</p>}
      </fieldset> : <div className="space-y-2">{weekKeys.filter(key => key !== date).map(key => <label key={key} className="flex min-h-11 items-center gap-3 text-sm"><Checkbox checked={destinations.includes(key)} onCheckedChange={checked => setDestinations(current => checked ? [...current, key] : current.filter(d => d !== key))} />{format(parseISO(key), "EEE dd/MM", { locale: ptBR })}</label>)}
        {occupied > 0 && <p className="text-xs text-steel">{occupied} dias já têm refeições planejadas. As novas serão adicionadas.</p>}
      </div>}
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={kind === "week" ? !previousCount : !destinations.length} onClick={apply}>Confirmar</Button></DialogFooter>
    </DialogContent></Dialog>
  </>;
}