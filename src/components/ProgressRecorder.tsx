import { useState, type FormEvent } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toDateKey } from "@/lib/calendar-utils";
import { progressKinds as kinds, progressPayload, progressValueError, type ProgressEntry, type ProgressKind } from "@/lib/progress";
import { useProgressEntries } from "@/lib/use-progress-entries";

/** Registration of progress entries, living in the module that owns each kind (Progresso is read-only). */
export function ProgressRecorder({ kinds: allowed, title, id, hint }: { kinds: ProgressKind[]; title: string; id?: string; hint?: string }) {
  const { user } = useAuth();
  const { entries, saved, removed, saveWeight } = useProgressEntries();
  const [kind, setKind] = useState<ProgressKind>(allowed[0] ?? "weight");
  const [value, setValue] = useState("");
  const [detail, setDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [valueError, setValueError] = useState<string | null>(null);
  const [date, setDate] = useState(() => toDateKey(new Date()));
  if (!user) return null;
  const recent = entries.filter((e) => allowed.includes(e.kind as ProgressKind)).slice(-6).reverse();

  async function addEntry(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const errorMessage = progressValueError(value);
    setValueError(errorMessage);
    if (errorMessage) return;
    const payload = { user_id: user.id, entry_date: date, ...progressPayload(kind, value, detail, notes) };
    if (kind === "weight") {
      try { await saveWeight(date, payload.value, payload.notes); } catch { toast.error("Não foi possível salvar o registro."); return; }
    } else {
      const { data, error } = await supabase.from("progress_entries").insert(payload).select("id, entry_date, kind, value, unit, label, notes").single();
      if (error || !data) { toast.error("Não foi possível salvar o registro."); return; }
      saved(data as ProgressEntry);
    }
    setValue(""); setDetail(""); setNotes(""); setValueError(null); toast.success("Progresso registrado.");
  }

  async function removeEntry(entryId: string) {
    const { error } = await supabase.from("progress_entries").delete().eq("id", entryId);
    if (error) { toast.error("Não foi possível remover o registro."); return; }
    removed(entryId);
  }

  const field = "mt-1.5 h-10 w-full rounded-md bg-background px-3 font-normal ring-1 ring-line";
  return (
    <section id={id} className="mt-6 scroll-mt-24 rounded-lg bg-card p-5 ring-1 ring-line">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-steel">{hint ?? "Aparece também nos gráficos do Progresso."}</p>
      <form noValidate onSubmit={addEntry} className="mt-4 grid gap-3 sm:grid-cols-2">
        {allowed.length > 1 && <label className="block text-sm font-medium">Tipo<select value={kind} onChange={(e) => { setKind(e.target.value as ProgressKind); setDetail(""); setValueError(null); }} className={field}>{allowed.map((k) => <option key={k} value={k}>{kinds[k].label}</option>)}</select></label>}
        <label className="block text-sm font-medium">Data<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} /></label>
        <label className="block text-sm font-medium">Detalhe (opcional)<input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={kinds[kind].detail} className={field} /></label>
        <label className="block text-sm font-medium">Valor ({kinds[kind].unit})<input type="number" min="0.01" step="any" placeholder={kinds[kind].placeholder} aria-invalid={Boolean(valueError)} value={value} onChange={(e) => { setValue(e.target.value); setValueError(null); }} className={field} />{valueError && <span role="alert" className="mt-1 block text-xs text-destructive">{valueError}</span>}</label>
        <label className="block text-sm font-medium sm:col-span-2">Observações<textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5 min-h-16 w-full rounded-md bg-background p-3 font-normal ring-1 ring-line" /></label>
        <Button className="sm:col-span-2"><Plus /> Salvar registro</Button>
      </form>
      {recent.length > 0 && <ul className="mt-4 divide-y divide-line border-t border-line">{recent.map((entry) => <li key={entry.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm font-medium">{entry.label}</p><p className="text-xs text-steel">{format(parseISO(entry.entry_date), "dd 'de' MMMM", { locale: ptBR })}{entry.notes ? ` · ${entry.notes}` : ""}</p></div><div className="flex items-center gap-2"><span className="text-sm font-semibold">{Number(entry.value).toLocaleString("pt-BR")} {entry.unit}</span><Button variant="ghost" size="icon" className="size-7" onClick={() => removeEntry(entry.id)} aria-label="Remover registro"><Trash2 /></Button></div></li>)}</ul>}
    </section>
  );
}
