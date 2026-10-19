import { ModuleHeader } from "@/components/ModuleHeader";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Droplets, Minus, Moon, Pill, Plus, Scale, Trash2 } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";
import { emptyHealth, lastDays, shortDay } from "@/lib/engagement";

export const Route = createFileRoute("/saude")({
  head: () => ({ meta: [
    { title: "Saúde — TaskBio" },
    { name: "description", content: "Registro rápido de água, sono e peso com gráficos dos últimos 30 dias." },
    { property: "og:title", content: "Saúde — TaskBio" },
    { property: "og:description", content: "Água, sono e peso registrados em um toque." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Saude,
});

function Saude() {
  const { health: raw, setHealth } = useTaskBio();
  const health = { ...emptyHealth, ...raw };
  const [today, setToday] = useState<string | null>(null);
  const [sleep, setSleep] = useState("");
  const [weight, setWeight] = useState("");
  const [med, setMed] = useState({ name: "", time: "08:00" });
  useEffect(() => setToday(toDateKey(new Date())), []);
  if (!today) return <main className="mx-auto max-w-4xl px-5 pt-8"><div className="h-60 animate-pulse rounded-lg bg-mist" /></main>;
  const water = health.water[today] ?? 0;
  const days = lastDays(new Date(), 30);
  const series = (rec: Record<string, number>) => days.map((d) => ({ d: shortDay(d), v: rec[d] ?? null }));
  const setWater = (n: number) => setHealth((h) => ({ ...h, water: { ...h.water, [today]: Math.max(0, n) } }));

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <ModuleHeader title="Saúde" />
      <section className="pb-5"><h2 className="font-display text-lg font-semibold">Registro rápido</h2><p className="mt-2 text-sm text-steel">Registros pessoais de acompanhamento; não substituem orientação médica.</p></section>
      <div className="grid gap-3 md:grid-cols-3">
        <Card icon={<Droplets className="size-4 text-brand" />} title="Água">
          <p className="font-display text-3xl font-semibold">{water}<span className="text-base text-steel"> / {health.waterGoal} copos</span></p>
          <div className="mt-3 flex gap-2"><Button variant="outline" size="icon" aria-label="Remover copo" onClick={() => setWater(water - 1)}><Minus /></Button><Button className="flex-1" onClick={() => { setWater(water + 1); if (water + 1 === health.waterGoal) toast.success("Meta de água alcançada!"); else toast.success("+1 copo"); }}><Plus /> 1 copo</Button></div>
          <label className="mt-3 block text-xs text-steel">Meta diária<input type="number" min="1" value={health.waterGoal} onChange={(e) => setHealth((h) => ({ ...h, waterGoal: Math.max(1, Number(e.target.value) || 1) }))} className="ml-2 h-7 w-16 rounded-md bg-background px-2 ring-1 ring-line" /></label>
        </Card>
        <Card icon={<Moon className="size-4 text-brand" />} title="Sono">
          <p className="font-display text-3xl font-semibold">{health.sleep[today] ?? "—"}<span className="text-base text-steel"> h</span></p>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = Number(sleep); if (!(v > 0 && v <= 24)) return; setHealth((h) => ({ ...h, sleep: { ...h.sleep, [today]: v } })); setSleep(""); toast.success("Sono registrado"); }}><input type="number" step="0.5" min="0" max="24" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="Horas" className="h-9 min-w-0 flex-1 rounded-md bg-background px-3 text-sm ring-1 ring-line" /><Button className="shrink-0">Salvar</Button></form>
        </Card>
        <Card icon={<Scale className="size-4 text-brand" />} title="Peso">
          <p className="font-display text-3xl font-semibold">{health.weight[today] ?? "—"}<span className="text-base text-steel"> kg</span></p>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = Number(weight.replace(",", ".")); if (!(v > 0 && v < 500)) return; setHealth((h) => ({ ...h, weight: { ...h.weight, [today]: v } })); setWeight(""); toast.success("Peso registrado"); }}><input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="kg" className="h-9 min-w-0 flex-1 rounded-md bg-background px-3 text-sm ring-1 ring-line" /><Button className="shrink-0">Salvar</Button></form>
        </Card>
      </div>
      <section className="mt-3 rounded-lg bg-card p-4 ring-1 ring-line">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-steel"><Pill className="size-4 text-brand" />Medicamentos de hoje</p>
        <p className="text-xs text-steel">Com os avisos ativados no Perfil, você recebe uma notificação no horário. Siga sempre a prescrição do seu médico.</p>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!med.name.trim()) return; setHealth((h) => ({ ...h, meds: [...(h.meds ?? []), { id: `m-${Date.now()}`, name: med.name.trim(), time: med.time }].sort((a, b) => a.time.localeCompare(b.time)) })); setMed({ name: "", time: med.time }); toast.success("Medicamento adicionado"); }}><input aria-label="Medicamento" value={med.name} onChange={(e) => setMed({ ...med, name: e.target.value })} placeholder="Nome do medicamento" className="h-9 min-w-0 flex-1 rounded-md bg-background px-3 text-sm ring-1 ring-line" /><input aria-label="Horário" type="time" value={med.time} onChange={(e) => setMed({ ...med, time: e.target.value })} className="h-9 rounded-md bg-background px-2 text-sm ring-1 ring-line" /><Button><Plus /> Adicionar</Button></form>
        <ul className="mt-2 divide-y divide-line">{(health.meds ?? []).map((m) => { const taken = (health.medsTaken?.[today] ?? []).includes(m.id); return <li key={m.id} className="flex items-center gap-3 py-2 text-sm"><input type="checkbox" checked={taken} aria-label={`${m.name} tomado hoje`} onChange={() => setHealth((h) => { const cur = h.medsTaken?.[today] ?? []; return { ...h, medsTaken: { ...h.medsTaken, [today]: taken ? cur.filter((x) => x !== m.id) : [...cur, m.id] } }; })} /><span className={`flex-1 ${taken ? "text-steel line-through" : ""}`}>{m.time} · {m.name}</span><Button variant="ghost" size="icon" className="size-7" aria-label={`Remover ${m.name}`} onClick={() => setHealth((h) => ({ ...h, meds: (h.meds ?? []).filter((x) => x.id !== m.id) }))}><Trash2 /></Button></li>; })}</ul>
      </section>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Chart title="Água (copos)" data={series(health.water)} />
        <Chart title="Sono (horas)" data={series(health.sleep)} />
        <Chart title="Peso (kg)" data={series(health.weight)} />
      </div>
    </main>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="rounded-lg bg-card p-4 ring-1 ring-line"><p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-steel">{icon}{title} hoje</p>{children}</section>;
}

function Chart({ title, data }: { title: string; data: { d: string; v: number | null }[] }) {
  return <section className="rounded-lg bg-card p-4 ring-1 ring-line"><p className="text-xs font-medium text-steel">{title} · 30 dias</p><div className="mt-2 h-36"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><XAxis dataKey="d" tick={{ fontSize: 10 }} interval={6} /><YAxis tick={{ fontSize: 10 }} width={28} domain={["auto", "auto"]} /><Tooltip /><Line type="monotone" dataKey="v" stroke="var(--color-brand, currentColor)" strokeWidth={2} dot={false} connectNulls /></LineChart></ResponsiveContainer></div></section>;
}
