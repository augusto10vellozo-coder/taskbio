import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";
import { FIXED_CATEGORIES, brl, emptyFinance, shoppingSignature, validAmount } from "@/lib/finance";

const LIST_NAME = "Lista de compras";
const field = "mt-1 h-10 w-full rounded-md bg-background px-3 text-sm ring-1 ring-line";

/** Shown once the whole list is in the cart; never creates an expense without explicit confirmation. */
export function ShoppingFinanceBridge({ cost }: { cost: number }) {
  const { shoppingItems, finance: raw, setFinance } = useTaskBio();
  const f = { ...emptyFinance, ...raw };
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Mercado");
  const [date, setDate] = useState("");
  const finished = shoppingItems.length > 0 && shoppingItems.every((i) => i.checked);
  const signature = shoppingSignature(shoppingItems);
  const record = f.shoppingRecord;
  if (!record && !finished) return null;

  if (record) return (
    <div className="mt-4 rounded-md bg-mist/60 p-3 text-sm">
      <p className="font-medium">✓ Já registrado em Finanças · {brl(record.amount)}</p>
      {record.signature !== signature && <p className="mt-1 text-xs text-steel">A lista mudou depois do registro — o valor lançado pode estar desatualizado.</p>}
    </div>
  );

  const confirm = () => {
    const v = Number(amount.replace(",", "."));
    if (!validAmount(v)) { toast.error("Informe um valor entre R$ 0,01 e R$ 1.000.000,00"); return; }
    if (!date) { toast.error("Escolha a data"); return; }
    setFinance((s) => ({ ...s, entries: [{ id: `f-${Date.now()}`, date, amount: v, description: LIST_NAME, category, type: "gasto", source: "compras" }, ...s.entries], shoppingRecord: { signature, amount: v, date } }));
    setOpen(false);
    toast.success(`Gasto de ${brl(v)} registrado`);
  };

  return (
    <>
      <div className="mt-4 flex justify-end"><Button onClick={() => { setAmount(cost > 0 ? String(cost.toFixed(2)).replace(".", ",") : ""); setCategory("Mercado"); setDate(toDateKey(new Date())); setOpen(true); }}>Registrar como gasto em Finanças</Button></div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar gasto da lista</DialogTitle><DialogDescription>Confira antes de lançar. Nada é registrado sem sua confirmação.</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <label className="text-xs text-steel">Valor (estimado: {cost > 0 ? brl(cost) : "sem estimativa"})<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="R$ 0,00" className={field} /></label>
            <label className="text-xs text-steel">Categoria<select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>{[...FIXED_CATEGORIES, ...f.customCategories].map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="text-xs text-steel">Data<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} /></label>
            {date && <p className="text-xs text-steel">Entra no mês de {format(parseISO(date), "MMMM 'de' yyyy", { locale: ptBR })}.</p>}
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={confirm}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
