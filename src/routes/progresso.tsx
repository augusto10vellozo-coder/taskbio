import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { format, isAfter, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, Plus, Trash2, TrendingUp } from "lucide-react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useTrilha } from "@/lib/trilha-store";
import { getWeekDates, toDateKey } from "@/lib/calendar-utils";

export const Route = createFileRoute("/progresso")({
  head: () => ({ meta: [
    { title: "Meu progresso — Trilha" },
    { name: "description", content: "Registre peso, medidas, força e corrida e acompanhe sua evolução por período." },
    { property: "og:title", content: "Meu progresso — Trilha" },
    { property: "og:description", content: "Gráficos de evolução, consistência e histórico de atividades." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Progresso,
});

type ProgressEntry = { id: string; entry_date: string; kind: string; value: number; unit: string; label: string; notes: string | null };
const kinds = {
  weight: { label: "Peso", unit: "kg" },
  measurement: { label: "Medida corporal", unit: "cm" },
  strength: { label: "Carga", unit: "kg" },
  run: { label: "Corrida", unit: "km" },
  consistency: { label: "Consistência", unit: "%" },
} as const;
const chartConfig = { value: { label: "Valor", color: "var(--brand)" } } satisfies ChartConfig;

function Progresso() {
  const { user, loading: authLoading } = useAuth();
  const { plan, workouts, workoutHistory, getMeal, weeklyGoals, setWeeklyGoals } = useTrilha();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [kind, setKind] = useState<keyof typeof kinds>("weight");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let active = true;
    supabase.from("progress_entries").select("id, entry_date, kind, value, unit, label, notes").eq("user_id", user.id).order("entry_date", { ascending: true }).then(({ data, error }) => {
      if (!active) return;
      if (error) toast.error("Não foi possível carregar seus registros.");
      setEntries((data as ProgressEntry[] | null) ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [authLoading, user?.id]);

  const filtered = useMemo(() => {
    const cutoff = subDays(new Date(), period);
    return entries.filter((entry) => entry.kind === kind && isAfter(parseISO(entry.entry_date), cutoff));
  }, [entries, kind, period]);
  const chartData = filtered.map((entry) => ({ date: format(parseISO(entry.entry_date), "dd/MM"), value: Number(entry.value), label: entry.label }));
  const latest = filtered.at(-1);
  const first = filtered[0];
  const delta = latest && first ? Number(latest.value) - Number(first.value) : 0;
  const weekDates = getWeekDates(new Date());
  const all = weekDates.flatMap((day) => plan[toDateKey(day)] ?? []);
  const done = all.filter((block) => block.done);
  const pct = all.length ? Math.round(done.length / all.length * 100) : 0;
  const totalVolume = workoutHistory.reduce((sum, entry) => sum + entry.totalVolumeKg, 0);
  const weeklyCount = (dates: Date[]) => {
    const blocks = dates.flatMap((day) => plan[toDateKey(day)] ?? []);
    return [blocks.filter((b) => b.kind === "treino" && b.done).length,
      dates.filter((day) => (plan[toDateKey(day)] ?? []).some((b) => b.kind === "refeicao")).length,
      dates.filter((day) => (plan[toDateKey(day)] ?? []).some((b) => b.kind === "descanso")).length];
  };
  const thisWeek = weeklyCount(weekDates);
  const lastWeek = weeklyCount(getWeekDates(subDays(new Date(), 7)));
  const goalRows = (["Treinos realizados", "Dias com refeições planejadas", "Dias de descanso"] as const).map((label, index) => ({ label, value: thisWeek[index] ?? 0, previous: lastWeek[index] ?? 0, target: [weeklyGoals.workouts, weeklyGoals.mealDays, weeklyGoals.restDays][index] ?? 0, key: (["workouts", "mealDays", "restDays"] as const)[index] }));

  async function addEntry(event: FormEvent) {
    event.preventDefault();
    if (!user || !value || !label.trim()) return;
    const payload = { user_id: user.id, entry_date: date, kind, value: Number(value), unit: kinds[kind].unit, label: label.trim(), notes: notes.trim() || null };
    const { data, error } = await supabase.from("progress_entries").insert(payload).select("id, entry_date, kind, value, unit, label, notes").single();
    if (error || !data) { toast.error("Não foi possível salvar o registro."); return; }
    setEntries((current) => [...current, data as ProgressEntry].sort((a, b) => a.entry_date.localeCompare(b.entry_date)));
    setValue(""); setLabel(""); setNotes(""); toast.success("Progresso registrado.");
  }

  async function removeEntry(id: string) {
    const { error } = await supabase.from("progress_entries").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover o registro."); return; }
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  if (!authLoading && !user) return <main className="mx-auto max-w-4xl px-5 py-16 text-center"><Activity className="mx-auto size-9 text-brand-deep" /><h1 className="mt-4 font-display text-3xl font-semibold">Seu progresso começa com sua conta</h1><p className="mx-auto mt-2 max-w-lg text-sm text-steel">Entre para salvar seus registros com segurança e acompanhar a evolução.</p><Button asChild className="mt-6"><Link to="/auth">Entrar ou criar conta</Link></Button></main>;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <section className="pt-8 pb-5"><p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Meu progresso</p><h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Evolução baseada nos seus registros</h1><p className="mt-2 text-sm text-steel">Acompanhe tendências sem transformar números isolados em diagnóstico.</p></section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Rotina semanal", `${pct}%`, `${done.length} de ${all.length} blocos`], ["Treinos concluídos", `${workoutHistory.length}`, "histórico total"], ["Volume registrado", `${totalVolume.toLocaleString("pt-BR")} kg`, "nos treinos"], ["Calorias planejadas", all.reduce((sum, block) => sum + (getMeal(block.mealId)?.macros.kcal ?? 0), 0).toLocaleString("pt-BR"), "semana atual"]].map(([title, stat, detail]) => <article key={title} className="rounded-lg bg-card p-4 ring-1 ring-line"><p className="text-[11px] uppercase text-steel">{title}</p><p className="mt-2 font-display text-2xl font-semibold">{stat}</p><p className="mt-1 text-xs text-steel">{detail}</p></article>)}</div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[340px_1fr]">
        <form onSubmit={addEntry} className="rounded-lg bg-card p-5 ring-1 ring-line"><h2 className="font-display text-lg font-semibold">Novo registro</h2><div className="mt-4 space-y-4"><label className="block text-sm font-medium">Tipo<select value={kind} onChange={(event) => { const next = event.target.value as keyof typeof kinds; setKind(next); setLabel(kinds[next].label); }} className="mt-1.5 h-10 w-full rounded-md bg-background px-3 font-normal ring-1 ring-line">{Object.entries(kinds).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label><label className="block text-sm font-medium">Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-md bg-background px-3 font-normal ring-1 ring-line" /></label><label className="block text-sm font-medium">Nome<input required value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Ex.: Peso corporal, cintura, supino" className="mt-1.5 h-10 w-full rounded-md bg-background px-3 font-normal ring-1 ring-line" /></label><label className="block text-sm font-medium">Valor ({kinds[kind].unit})<input required type="number" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} className="mt-1.5 h-10 w-full rounded-md bg-background px-3 font-normal ring-1 ring-line" /></label><label className="block text-sm font-medium">Observações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1.5 min-h-20 w-full rounded-md bg-background p-3 font-normal ring-1 ring-line" /></label><Button className="w-full"><Plus /> Salvar registro</Button></div></form>
        <section className="rounded-lg bg-card p-5 ring-1 ring-line">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Tendência de {kinds[kind].label.toLocaleLowerCase("pt-BR")}</h2><p className="mt-1 text-xs text-steel">{latest ? `Último: ${Number(latest.value).toLocaleString("pt-BR")} ${latest.unit} · variação ${delta >= 0 ? "+" : ""}${delta.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}` : "Adicione registros para visualizar a evolução."}</p></div><div className="flex gap-1">{([7, 30, 90] as const).map((days) => <Button key={days} size="sm" variant={period === days ? "default" : "outline"} onClick={() => setPeriod(days)}>{days} dias</Button>)}</div></div>
          <div className="mt-4 flex flex-wrap gap-1.5">{Object.entries(kinds).map(([key, item]) => <Button key={key} size="sm" variant={kind === key ? "default" : "outline"} onClick={() => setKind(key as keyof typeof kinds)}>{item.label}</Button>)}</div>
          {loading ? <div className="mt-6 h-64 animate-pulse rounded-lg bg-mist" /> : chartData.length < 2 ? <div className="mt-6 grid h-64 place-items-center border-y border-dashed border-line text-center"><div><TrendingUp className="mx-auto size-7 text-steel" /><p className="mt-2 text-sm font-medium">Ainda não há tendência suficiente</p><p className="mt-1 text-xs text-steel">Dois ou mais registros formam o gráfico.</p></div></div> : <ChartContainer config={chartConfig} className="mt-5 h-72 w-full aspect-auto"><LineChart data={chartData} margin={{ left: 4, right: 16, top: 12 }}><CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} width={42} /><ChartTooltip content={<ChartTooltipContent />} /><Line dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ChartContainer>}
          <div className="mt-5 border-t border-line pt-4"><h3 className="text-sm font-semibold">Registros recentes</h3>{filtered.length === 0 ? <p className="mt-3 text-sm text-steel">Nenhum registro neste período.</p> : <ul className="mt-2 divide-y divide-line">{[...filtered].reverse().slice(0, 8).map((entry) => <li key={entry.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{entry.label}</p><p className="text-xs text-steel">{format(parseISO(entry.entry_date), "dd 'de' MMMM", { locale: ptBR })}{entry.notes ? ` · ${entry.notes}` : ""}</p></div><div className="flex items-center gap-2"><span className="text-sm font-semibold">{Number(entry.value).toLocaleString("pt-BR")} {entry.unit}</span><Button variant="ghost" size="icon" className="size-7" onClick={() => removeEntry(entry.id)} aria-label="Remover registro"><Trash2 /></Button></div></li>)}</ul>}</div>
        </section>
      </div>
    </main>
  );
}