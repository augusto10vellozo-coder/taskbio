import { ModuleHeader } from "@/components/ModuleHeader";
import { ProgressRecorder } from "@/components/ProgressRecorder";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Droplets, Minus, Moon, Pill, Plus, Scale, Trash2 } from "lucide-react";
import { EmptyState, ModuleGate } from "@/components/EmptyState";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, LabelList } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTaskBio } from "@/lib/trilha-store";
import { useAuth } from "@/lib/auth-context";
import { useProgressEntries } from "@/lib/use-progress-entries";
import { toDateKey } from "@/lib/calendar-utils";
import { emptyHealth, lastDays, shortDay, type Medication } from "@/lib/engagement";
import { commonMedications, doseTaken, medicationDoses, medicationPreview, medicationSuggestion, previousSevenAverage, shiftHealthDay, sleepTime, validHealthWeight } from "@/lib/health";

export const Route = createFileRoute("/saude")({
  head: () => ({ meta: [
    { title: "Saúde — TaskBio" },
    { name: "description", content: "Acompanhe água, sono, peso e doses de medicamentos com seu histórico pessoal." },
    { property: "og:title", content: "Saúde — TaskBio" },
    { property: "og:description", content: "Registros pessoais de saúde, gráficos e horários de medicamentos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Saude,
});
const field = "h-10 min-w-0 w-full rounded-md bg-background px-3 text-sm ring-1 ring-line";
function Saude() {
  const { health: raw, setHealth } = useTaskBio();
  const { user } = useAuth();
  const { entries, saveWeight, loading: weightLoading, error: weightError } = useProgressEntries();
  const health = { ...emptyHealth, ...raw };
  const [today, setToday] = useState<string | null>(null);
  const [waterDay, setWaterDay] = useState<string | null>(null);
  const [sleep, setSleep] = useState("");
  const [weight, setWeight] = useState("");
  const [editing, setEditing] = useState<"sleep" | "weight" | null>(null);
  const [saving, setSaving] = useState(false);
  const [med, setMed] = useState({ name: "", time: "08:00", interval: 24, period: false, start: "", end: "" });
  useEffect(() => { const day = toDateKey(new Date()); setToday(day); setWaterDay(day); setMed(m => ({ ...m, start: day })); }, []);
  if (!today || !waterDay) return <main className="mx-auto max-w-4xl px-5 pt-8"><div className="h-60 animate-pulse rounded-lg bg-mist" /></main>;
  const water = health.water[waterDay] ?? 0;
  const days = lastDays(new Date(`${today}T12:00:00`), 30);
  const weights = Object.fromEntries(entries.filter(e => e.kind === "weight").map(e => [e.entry_date, Number(e.value)]));
  const measures = entries.filter(e => e.kind === "measurement" && e.entry_date === today);
  const series = (rec: Record<string, number>) => days.map(d => ({ date: d, d: shortDay(d), v: rec[d] ?? null }));
  const waterAverage = previousSevenAverage(health.water, waterDay);
  const sleepAverage = previousSevenAverage(health.sleep, today);
  const weightAverage = previousSevenAverage(weights, today);
  const currentWeight = weights[today];
  const doses = medicationDoses(health.meds ?? [], today);
  const marks = health.medsTaken?.[today] ?? [];
  const suggestion = medicationSuggestion(med.name);
  const setWater = (n: number) => setHealth(h => ({ ...h, water: { ...h.water, [waterDay]: Math.max(0, n) } }));
  return <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
    <ModuleHeader title="Saúde" />
    <ModuleGate id="saude">
    <section className="pb-5"><h2 className="font-display text-lg font-semibold">Registro rápido</h2></section>
    <div className="grid gap-3 md:grid-cols-3">
      <Card icon={<Droplets className="size-4 text-brand" />} title={waterDay === today ? "Água hoje" : `Água · ${shortDay(waterDay)}`} tools={<div className="flex"><Button variant="ghost" size="icon" aria-label="Dia anterior da água" onClick={() => setWaterDay(shiftHealthDay(waterDay, -1))}><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label="Próximo dia da água" disabled={waterDay >= today} onClick={() => setWaterDay(shiftHealthDay(waterDay, 1))}><ChevronRight /></Button></div>}>
        <p className="font-display text-3xl font-semibold">{water}<span className="text-base text-steel"> / {health.waterGoal} copos</span></p>
        {waterAverage !== null && <p className="mt-1 text-xs text-steel">média 7 dias: {waterAverage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} copos</p>}
        <div className="mt-3 flex gap-2"><Button variant="outline" size="icon" aria-label="Remover copo" onClick={() => setWater(water - 1)}><Minus /></Button><Button className="flex-1" onClick={() => { setWater(water + 1); toast.success(water + 1 === health.waterGoal ? "Meta de água alcançada!" : "+1 copo"); }}><Plus /> 1 copo</Button></div>
        <label className="mt-3 flex items-center gap-2 text-xs text-steel">Meta diária<input aria-label="Meta diária de água" type="number" min="1" value={health.waterGoal} onChange={e => { const goal = Math.max(1, Math.round(Number(e.target.value) || 1)); setHealth(h => ({ ...h, waterGoal: goal })); }} className="h-8 w-16 rounded-md bg-background px-2 ring-1 ring-line" /></label><p className="mt-2 text-xs text-steel" role="status">Meta de água: {health.waterGoal} copos por dia</p>
      </Card>
      <Card icon={<Moon className="size-4 text-brand" />} title="Sono hoje">
        <p className="font-display text-3xl font-semibold">{health.sleep[today]?.toLocaleString("pt-BR") ?? "—"}<span className="text-base text-steel"> h</span></p>
        {sleepAverage !== null && <p className="mt-1 text-xs text-steel">média 7 dias: {sleepTime(sleepAverage)}</p>}
        {editing !== "sleep" ? <Button className="mt-3 w-full" variant="outline" onClick={() => setEditing("sleep")}>Registrar</Button> : <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); const v = Number(sleep.replace(",", ".")); if (!(v > 0 && v <= 24)) { toast.error("Informe entre 0 e 24 horas."); return; } setHealth(h => ({ ...h, sleep: { ...h.sleep, [today]: v } })); setEditing(null); setSleep(""); toast.success("Sono registrado"); }}><input autoFocus aria-label="Horas de sono" className={field} inputMode="decimal" value={sleep} onChange={e => setSleep(e.target.value)} placeholder="Horas" /><Button>Salvar</Button></form>}
      </Card>
      <Card icon={<Scale className="size-4 text-brand" />} title="Peso hoje">
        <p className="font-display text-3xl font-semibold">{currentWeight?.toLocaleString("pt-BR") ?? "—"}<span className="text-base text-steel"> kg</span></p>
        {weightAverage !== null && currentWeight !== undefined && <p className="mt-1 text-xs text-steel">{currentWeight - weightAverage >= 0 ? "+" : "−"}{Math.abs(currentWeight - weightAverage).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg desde a semana passada</p>}
        {!user ? <Button asChild variant="outline" className="mt-3 w-full"><Link to="/auth">Entrar para registrar</Link></Button> : editing !== "weight" ? <Button className="mt-3 w-full" variant="outline" onClick={() => setEditing("weight")}>Registrar</Button> : <form className="mt-3 flex gap-2" onSubmit={async e => { e.preventDefault(); const v = Number(weight.replace(",", ".")); if (!validHealthWeight(v)) { toast.error("Informe um peso maior que zero e menor que 500 kg."); return; } setSaving(true); try { await saveWeight(today, v); setWeight(""); setEditing(null); toast.success("Peso registrado"); } catch { toast.error("Não foi possível salvar o peso."); } finally { setSaving(false); } }}><input autoFocus aria-label="Peso em kg" inputMode="decimal" className={field} value={weight} onChange={e => setWeight(e.target.value)} placeholder="kg" /><Button disabled={saving}>Salvar</Button></form>}
        {weightError && <p role="alert" className="mt-2 text-xs text-destructive">Não foi possível carregar seus pesos.</p>}
        {measures.map(e => <p key={e.id} className="mt-2 text-xs text-steel">Medida corporal: {e.value.toLocaleString("pt-BR")} {e.unit}{e.notes ? ` · ${e.notes}` : ""}</p>)}
      </Card>
    </div>
    <section className="mt-5 border-t border-line pt-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Pill className="size-4 text-brand" />Medicamentos de hoje</h2>
      <p className="mt-1 text-xs text-steel">A gente te lembra no horário. Siga sempre a prescrição do seu médico.</p>
      <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); if (!med.name.trim() || !med.time || !med.start || (med.period && (!med.end || med.end < med.start))) { toast.error("Preencha o medicamento e as datas do período."); return; } const item: Medication = { id: `m-${crypto.randomUUID()}`, name: med.name.trim(), time: med.time, intervalHours: med.interval as 4 | 6 | 8 | 12 | 24, startDate: med.start, ...(med.period ? { endDate: med.end } : {}) }; setHealth(h => ({ ...h, meds: [...(h.meds ?? []), item] })); setMed(m => ({ ...m, name: "" })); toast.success("Medicamento adicionado"); }}>
        <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs text-steel block">Medicamento<input id="med-name" aria-label="Medicamento" list="medicamentos-comuns" className={field} value={med.name} onChange={e => setMed({ ...med, name: e.target.value })} placeholder="Nome do medicamento" required /></label><label className="block space-y-1 text-xs text-steel">Primeira dose<input aria-label="Primeira dose" type="time" className={field} value={med.time} onChange={e => setMed({ ...med, time: e.target.value })} required /></label></div>
        <datalist id="medicamentos-comuns">{commonMedications.map(n => <option key={n} value={n} />)}</datalist>
        {suggestion && <div className="flex flex-wrap items-center gap-2 text-sm"><span>Você quis dizer {suggestion.toLocaleLowerCase("pt-BR")}?</span><Button type="button" size="sm" variant="outline" onClick={() => setMed({ ...med, name: suggestion })}>Aceitar</Button></div>}
        <fieldset><legend className="mb-2 text-xs text-steel">Intervalo entre doses</legend><div className="flex flex-wrap gap-2">{[4,6,8,12,24].map(n => <Button key={n} type="button" size="sm" variant={med.interval === n ? "default" : "outline"} aria-pressed={med.interval === n} onClick={() => setMed({ ...med, interval: n })}>{n === 24 ? "1x ao dia (24h)" : `de ${n} em ${n}h`}</Button>)}</div></fieldset>
        <p className="text-sm" role="status">Doses: {medicationPreview(med.time, med.interval).join(" · ")}</p>
        <fieldset className="flex flex-wrap gap-4 text-sm"><legend className="mb-2 text-xs text-steel">Duração</legend><label className="flex items-center gap-2"><input type="radio" name="duration" checked={!med.period} onChange={() => setMed({ ...med, period: false })} />Uso contínuo</label><label className="flex items-center gap-2"><input type="radio" name="duration" checked={med.period} onChange={() => setMed({ ...med, period: true })} />Por um período</label></fieldset>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1 text-xs text-steel">Data de início<input aria-label="Data de início" type="date" className={field} value={med.start} onChange={e => setMed({ ...med, start: e.target.value })} required /></label>{med.period && <label className="block space-y-1 text-xs text-steel">Data de fim<input aria-label="Data de fim" type="date" min={med.start} className={field} value={med.end} onChange={e => setMed({ ...med, end: e.target.value })} required /></label>}</div>
        <Button><Plus /> Adicionar</Button>
      </form>
      {(health.meds ?? []).length === 0 ? <EmptyState icon={Pill} title="Nenhum remédio cadastrado" context="Cadastre seus remédios para receber o lembrete no horário certo." actionLabel="Cadastrar remédio" onAction={() => document.getElementById("med-name")?.focus()} secondaryLabel="Ver consultas" onSecondary={() => { document.getElementById("agenda-link")?.click(); }} /> : doses.length === 0 ? <p className="mt-4 text-sm text-steel">Nenhuma dose prevista para hoje.</p> : <ul className="mt-3 divide-y divide-line">{doses.map(dose => { const taken = doseTaken(dose, marks); return <li key={dose.id} className="flex items-start gap-3 py-3 text-sm"><input className="mt-1 size-4 shrink-0" type="checkbox" checked={taken} aria-label={`${dose.time} · ${dose.name} tomado hoje`} onChange={() => setHealth(h => { const cur = h.medsTaken?.[today] ?? []; return { ...h, medsTaken: { ...h.medsTaken, [today]: taken ? cur.filter(id => id !== dose.id && !(dose.legacy && id === dose.medicationId)) : [...cur, dose.id] } }; })} /><div className="min-w-0 flex-1"><span className={taken ? "text-steel line-through break-words" : "break-words"}>{dose.time} · {dose.name}</span>{dose.remainingDays !== undefined && <p className="mt-1 text-xs text-steel">{dose.remainingDays === 0 ? "Último dia deste medicamento" : `faltam ${dose.remainingDays} dias`}</p>}</div><Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Remover ${dose.name}`} onClick={() => setHealth(h => ({ ...h, meds: (h.meds ?? []).filter(m => m.id !== dose.medicationId) }))}><Trash2 /></Button></li>; })}</ul>}
    </section>
    <div className="mt-5 grid gap-3 md:grid-cols-3"><HealthChart title="Água (copos)" data={series(health.water)} goal={health.waterGoal} labels /><HealthChart title="Sono (horas)" data={series(health.sleep)} goal={health.sleepGoal} sleep /><HealthChart title="Peso (kg)" data={series(weights)} labels loading={weightLoading} /></div>
    <ProgressRecorder id="registros-saude" title="Peso e medidas" kinds={["weight", "measurement"]} />
  </main>;
}
function Card({ icon, title, tools, children }: { icon: ReactNode; title: string; tools?: ReactNode; children: ReactNode }) {
  return <section className="min-w-0 rounded-lg bg-card p-4 ring-1 ring-line"><div className="mb-2 flex min-h-10 items-center justify-between gap-1"><h3 className="flex items-center gap-1.5 text-xs font-medium text-steel">{icon}{title}</h3>{tools}</div>{children}</section>;
}
function HealthChart({ title, data, goal, labels, sleep, loading }: { title: string; data: { date: string; d: string; v: number | null }[]; goal?: number | undefined; labels?: boolean; sleep?: boolean; loading?: boolean }) {
  const values = data.flatMap(d => d.v === null ? [] : [d.v]);
  return <section className="min-w-0 rounded-lg bg-card p-4 ring-1 ring-line"><h3 className="text-xs font-medium text-steel">{title} · 30 dias</h3>{!values.length ? <p className="flex h-44 items-center justify-center text-center text-xs text-steel">{loading ? "Carregando registros…" : "Sem registros nos últimos 30 dias"}</p> : <div className="mt-2 h-44"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 22, right: 18, left: 0, bottom: 0 }}><XAxis dataKey="d" tick={{ fontSize: 10 }} interval={6} /><YAxis tick={{ fontSize: 10 }} width={36} domain={sleep ? [0, Math.max(12, Math.ceil(Math.max(...values) * 1.1))] : goal !== undefined ? [0, Math.max(goal, ...values) + 1] : ["auto", "auto"]} /><Tooltip labelFormatter={(_, payload) => { const date = payload[0]?.payload?.date; return typeof date === "string" ? new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : ""; }} formatter={v => [Number(v).toLocaleString("pt-BR"), title]} contentStyle={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--line)" }} />{goal !== undefined && <ReferenceLine y={goal} stroke="var(--brand)" strokeDasharray="4 4" />}<Line type="monotone" dataKey="v" stroke="var(--brand)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false}>{labels && <LabelList dataKey="v" position="top" fill="var(--foreground)" fontSize={10} formatter={(v: unknown) => v === null ? "" : Number(v).toLocaleString("pt-BR")} />}</Line></LineChart></ResponsiveContainer></div>}</section>;
}
