import { ModuleHeader } from "@/components/ModuleHeader";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";
import { lastDays } from "@/lib/engagement";

export function SessionTracker({ kind, title, subtitle, placeholder }: { kind: "leitura" | "estudos"; title: string; subtitle: string; placeholder: string }) {
  const { trackers, setTrackers } = useTaskBio();
  const list = trackers?.[kind] ?? [];
  const [minutes, setMinutes] = useState("");
  const [name, setName] = useState("");
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(toDateKey(new Date())), []);
  if (!today) return <main className="mx-auto max-w-4xl px-5 pt-8"><div className="h-60 animate-pulse rounded-lg bg-mist" /></main>;
  const week = lastDays(new Date(), 7);
  const weekMin = list.filter((e) => week.includes(e.date)).reduce((n, e) => n + e.minutes, 0);
  const todayMin = list.filter((e) => e.date === today).reduce((n, e) => n + e.minutes, 0);
  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <ModuleHeader title={title} /><p className="pb-5 text-sm text-steel">{subtitle}</p>
      <form className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 rounded-lg bg-card p-4 ring-1 ring-line" onSubmit={(e) => { e.preventDefault(); const m = Math.round(Number(minutes)); if (!(m > 0)) { toast.error("Informe os minutos"); return; } setTrackers((t) => ({ ...t, [kind]: [{ id: `s-${Date.now()}`, date: today, minutes: m, title: name.trim() }, ...t[kind]] })); setMinutes(""); toast.success("Sessão registrada"); }}>
        <input type="number" min="1" aria-label="Minutos" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Minutos" className="h-10 min-w-0 rounded-md bg-background px-3 text-sm ring-1 ring-line" />
        <input aria-label="Título" value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} className="h-10 min-w-0 rounded-md bg-background px-3 text-sm ring-1 ring-line" />
        <Button className="col-span-2 h-10"><Plus /> Registrar</Button>
      </form>
      <div className="mt-4 grid grid-cols-2 gap-3"><Stat label="Hoje" value={`${todayMin} min`} /><Stat label="Últimos 7 dias" value={`${weekMin} min`} /></div>
      <ul className="mt-4 divide-y divide-line rounded-lg bg-card px-4 ring-1 ring-line">{list.length === 0 ? <li className="py-6 text-center text-sm text-steel">Nenhuma sessão ainda.</li> : list.slice(0, 30).map((e) => <li key={e.id} className="flex items-center gap-3 py-2 text-sm"><span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{e.title || title} <span className="text-xs text-steel">· {e.date.split("-").reverse().join("/")}</span></span><span className="shrink-0 font-medium">{e.minutes} min</span><Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Remover sessão" onClick={() => setTrackers((t) => ({ ...t, [kind]: t[kind].filter((x) => x.id !== e.id) }))}><Trash2 /></Button></li>)}</ul>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <section className="rounded-lg bg-card p-4 ring-1 ring-line"><p className="text-xs font-medium text-steel">{label}</p><p className="mt-1 font-display text-2xl font-semibold">{value}</p></section>;
}
