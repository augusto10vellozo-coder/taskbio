import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, CalendarPlus, Dumbbell, Droplets, Frown, Laugh, Meh, Pill, Ruler, Scale, ShoppingBasket, Smile, UtensilsCrossed, Wallet, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";
import { doseTaken, medicationDoses } from "@/lib/health";
import { progressPayload, progressValueError } from "@/lib/progress";
import { useProgressEntries } from "@/lib/use-progress-entries";

type QuickKind = "agua" | "remedio" | "humor" | "peso" | "medida";

const QUICK_CHIPS: Array<{ id: QuickKind; label: string; icon: LucideIcon }> = [
  { id: "agua", label: "Água", icon: Droplets },
  { id: "remedio", label: "Remédio", icon: Pill },
  { id: "humor", label: "Humor", icon: Smile },
  { id: "peso", label: "Peso", icon: Scale },
  { id: "medida", label: "Medida corporal", icon: Ruler },
];

const NAV_CHIPS: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: "/alimentacao", label: "Refeição", icon: UtensilsCrossed },
  { to: "/treino", label: "Treino", icon: Dumbbell },
  { to: "/leitura", label: "Leitura", icon: BookOpen },
  { to: "/agenda", label: "Compromisso", icon: CalendarPlus },
  { to: "/progresso", label: "Carga ou corrida", icon: Ruler },
  { to: "/compras", label: "Compra", icon: ShoppingBasket },
  { to: "/financas", label: "Finança", icon: Wallet },
];

const MOODS = [
  { value: 1, label: "Muito ruim", icon: Frown },
  { value: 2, label: "Ruim", icon: Frown },
  { value: 3, label: "Neutro", icon: Meh },
  { value: 4, label: "Bom", icon: Smile },
  { value: 5, label: "Muito bom", icon: Laugh },
] as const;

const REGIONS = ["Cintura", "Quadril", "Braço", "Coxa", "Pescoço"];
const ML_PER_CUP = 250;

/** Bottom-sheet de registro rápido da Home: chips rápidos salvam no mesmo armazenamento dos módulos; chips navegados abrem o módulo. */
export function QuickRegisterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { health, setHealth } = useTaskBio();
  const { saveWeight } = useProgressEntries();
  const [form, setForm] = useState<QuickKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [peso, setPeso] = useState("");
  const [region, setRegion] = useState(REGIONS[0]!);
  const [cm, setCm] = useState("");
  const dragStart = useRef<number | null>(null);

  if (!open) return null;
  const today = toDateKey(new Date());

  const close = () => { setForm(null); setError(null); setPeso(""); setCm(""); onClose(); };
  const go = (to: string) => { close(); void navigate({ to }); };

  const addWater = (ml: number) => {
    const cups = Math.max(1, Math.round(ml / ML_PER_CUP));
    setHealth((h) => ({ ...h, water: { ...h.water, [today]: (h.water[today] ?? 0) + cups } }));
    toast.success(`Água registrada · ${ml >= 1000 ? "1 L" : `${ml} ml`}`);
    close();
  };

  const doses = medicationDoses(health.meds ?? [], today);
  const marks = health.medsTaken?.[today] ?? [];
  const pendingDoses = doses.filter((d) => !doseTaken(d, marks));
  const takeDose = (doseId: string, name: string) => {
    setHealth((h) => ({ ...h, medsTaken: { ...h.medsTaken, [today]: [...(h.medsTaken?.[today] ?? []), doseId] } }));
    toast.success(`Remédio registrado · ${name}`);
    close();
  };

  const setMood = (value: number, label: string) => {
    setHealth((h) => ({ ...h, mood: { ...h.mood, [today]: value } }));
    toast.success(`Humor registrado · ${label}`);
    close();
  };

  const savePeso = async () => {
    const invalid = progressValueError(peso);
    if (invalid) { setError(invalid); return; }
    setSaving(true); setError(null);
    try {
      await saveWeight(today, Number(peso.replace(",", ".")));
      toast.success(`Peso registrado · ${peso} kg`);
      close();
    } catch { setError("Não foi possível salvar. Tente novamente."); }
    finally { setSaving(false); }
  };

  const saveMedida = async () => {
    const invalid = progressValueError(cm);
    if (invalid) { setError(invalid); return; }
    if (!user) { setError("Entre na sua conta para salvar medidas."); return; }
    setSaving(true); setError(null);
    const payload = progressPayload("measurement", cm, region, "");
    const { error: dbError } = await supabase.from("progress_entries").insert({ user_id: user.id, entry_date: today, ...payload });
    setSaving(false);
    if (dbError) { setError("Não foi possível salvar. Tente novamente."); return; }
    toast.success(`Medida registrada · ${region} ${cm} cm`);
    close();
  };

  const field = "w-full rounded-xl border border-line bg-card px-3 py-3 text-sm text-ink placeholder:text-faint";

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Registrar agora">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-overlay" onClick={close} />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg rounded-t-[20px] bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200"
        onTouchStart={(e) => { dragStart.current = e.touches[0]?.clientY ?? null; }}
        onTouchEnd={(e) => {
          if (dragStart.current != null && (e.changedTouches[0]?.clientY ?? 0) - dragStart.current > 60) close();
          dragStart.current = null;
        }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-ink">{form ? QUICK_CHIPS.find((c) => c.id === form)?.label : "Registrar agora"}</h2>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Fechar" className="size-9 text-steel"><X className="size-4" /></Button>
        </div>

        {!form && (
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_CHIPS.map((chip) => (
              <button key={chip.id} type="button" onClick={() => { setForm(chip.id); setError(null); }} className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-3 text-sm font-medium text-ink">
                <chip.icon className="size-[18px] shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />{chip.label}
              </button>
            ))}
            {NAV_CHIPS.map((chip) => (
              <button key={chip.to} type="button" onClick={() => go(chip.to)} className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-3 text-sm font-medium text-ink">
                <chip.icon className="size-[18px] shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />{chip.label}
              </button>
            ))}
          </div>
        )}

        {form && (
          <div>
            <button type="button" onClick={() => { setForm(null); setError(null); }} className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-steel hover:text-ink"><ArrowLeft className="size-3.5" /> Voltar</button>

            {form === "agua" && (
              <div className="grid grid-cols-3 gap-2">
                {[{ ml: 250, label: "+250 ml" }, { ml: 500, label: "+500 ml" }, { ml: 1000, label: "+1 L" }].map((o) => (
                  <Button key={o.ml} variant="outline" className="h-12" onClick={() => addWater(o.ml)}>{o.label}</Button>
                ))}
              </div>
            )}

            {form === "remedio" && (
              pendingDoses.length === 0 ? (
                <p className="text-sm text-steel">Nenhum remédio cadastrado. <button type="button" className="font-medium text-brand-deep underline-offset-2 hover:underline" onClick={() => go("/saude")}>Abrir Saúde</button></p>
              ) : (
                <ul className="space-y-2">
                  {pendingDoses.map((dose) => (
                    <li key={dose.id}><button type="button" onClick={() => takeDose(dose.id, dose.name)} className="flex w-full items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 text-left text-sm font-medium text-ink"><Pill className="size-4 shrink-0 text-accent" aria-hidden="true" />{dose.time} · {dose.name}</button></li>
                  ))}
                </ul>
              )
            )}

            {form === "humor" && (
              <div className="grid grid-cols-5 gap-1.5">
                {MOODS.map((m) => (
                  <button key={m.value} type="button" onClick={() => setMood(m.value, m.label)} className="flex flex-col items-center gap-1 rounded-xl border border-line bg-card px-1 py-3 text-[11px] font-medium text-ink">
                    <m.icon className="size-5 text-accent" strokeWidth={1.5} aria-hidden="true" />{m.label}
                  </button>
                ))}
              </div>
            )}

            {form === "peso" && (
              <form onSubmit={(e) => { e.preventDefault(); void savePeso(); }} className="space-y-3">
                <input autoFocus inputMode="decimal" aria-label="Peso em kg" placeholder="Ex.: 85,2" value={peso} onChange={(e) => { setPeso(e.target.value); setError(null); }} className={field} />
                <Button type="submit" disabled={saving} className="h-12 w-full rounded-xl">{saving ? "Salvando..." : "Confirmar"}</Button>
              </form>
            )}

            {form === "medida" && (
              <form onSubmit={(e) => { e.preventDefault(); void saveMedida(); }} className="space-y-3">
                <select aria-label="Região do corpo" value={region} onChange={(e) => setRegion(e.target.value)} className={field}>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <input inputMode="decimal" aria-label="Medida em cm" placeholder="Ex.: 90" value={cm} onChange={(e) => { setCm(e.target.value); setError(null); }} className={field} />
                <Button type="submit" disabled={saving} className="h-12 w-full rounded-xl">{saving ? "Salvando..." : "Confirmar"}</Button>
              </form>
            )}

            {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
