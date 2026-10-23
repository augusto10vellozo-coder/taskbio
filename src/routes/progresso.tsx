import { ModuleHeader } from "@/components/ModuleHeader";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { format, isAfter, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, Plus, Trash2 } from "lucide-react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { mealSummary } from "@/lib/meal-summary";
import { getWeekDates, toDateKey } from "@/lib/calendar-utils";
import { progressKinds as kinds, normalizeProgressName, progressChartData, progressXAxis, progressYAxis, progressPayload, progressValueError, weeklyGoalProgress, type ProgressEntry } from "@/lib/progress";

export const Route = createFileRoute("/progresso")({
  head: () => ({ meta: [
    { title: "Meu progresso — TaskBio" },
    { name: "description", content: "Registre peso, medidas, força e corrida e acompanhe sua evolução por período." },
    { property: "og:title", content: "Meu progresso — TaskBio" },
    { property: "og:description", content: "Gráficos de evolução, consistência e histórico de atividades." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Progresso,
});

const chartConfig = { value: { label: "Valor", color: "var(--brand)" } } satisfies ChartConfig;

function Progresso() {
  const { user, loading: authLoading } = useAuth();
  const { plan, workoutHistory, getMeal, weeklyGoals, setWeeklyGoals } = useTaskBio();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [kind, setKind] = useState<keyof typeof kinds>("weight");
  const [value, setValue] = useState("");
  const [detail, setDetail] = useState("");
  const [valueError, setValueError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let active = true;
    supabase.from("progress_entries").select("id, entry_date, kind, value, unit, label, notes").eq("user_id", user.id).order("entry_date", { ascending: true }).then(({ data, error }) => {
      if (!active) return;
      if (error) toast.error("Não foi possível carregar seus registros.");
      setEntries(((data as ProgressEntry[] | null) ?? []).map((entry) => ({ ...entry, label: normalizeProgressName(entry.label) })));
      setLoading(false);
    });
    return () => { active = false; };
  }, [authLoading, user?.id]);

  const filtered = useMemo(() => {
    const cutoff = subDays(new Date(), period);
    return entries.filter((entry) => entry.kind === kind && isAfter(parseISO(entry.entry_date), cutoff)).sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  }, [entries, kind, period]);
  const chartData = progressChartData(filtered);
  const yAxis = progressYAxis(chartData.map((entry) => entry.value));
  const xAxis = progressXAxis(chartData.map((entry) => entry.timestamp));
  const axisUnit = filtered[0]?.unit ?? kinds[kind].unit;
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
  const goalRows = (["Treinos realizados", "Dias com refeições planejadas", "Dias de descanso"] as const).map((label, index) => ({ label, value: thisWeek[index] ?? 0, previous: lastWeek[index] ?? 0, target: [weeklyGoals.workouts, weeklyGoals.mealDays, weeklyGoals.restDays][index] ?? 0, key: (["workouts", "mealDays", "restDays"] as const)[index] ?? "workouts" }));

  async function addEntry(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const errorMessage = progressValueError(value);
    setValueError(errorMessage);
    if (errorMessage) return;
    const payload = { user_id: user.id, entry_date: date, ...progressPayload(kind, value, detail, notes) };
    const { data, error } = await supabase.from("progress_entries").insert(payload).select("id, entry_date, kind, value, unit, label, notes").single();
    if (error || !data) { toast.error("Não foi possível salvar o registro."); return; }
    setEntries((current) => [...current, data as ProgressEntry].sort((a, b) => a.entry_date.localeCompare(b.entry_date)));
    setValue(""); setDetail(""); setNotes(""); setValueError(null); toast.success("Progresso registrado.");
  }

  async function removeEntry(id: string) {
    const { error } = await supabase.from("progress_entries").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover o registro."); return; }
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  if (!authLoading && !user) return <main className="mx-auto max-w-4xl px-5 pb-16"><ModuleHeader title="Progresso" /><div className="pt-8 text-center"><Activity className="mx-auto size-9 text-brand-deep" /><h2 className="mt-4 font-display text-2xl font-semibold">Seu progresso começa com sua conta</h2><p className="mx-auto mt-2 max-w-lg text-sm text-steel">Entre pra guardar seus registros e ver sua evolução.</p><Button asChild className="mt-6"><Link to="/auth">Entrar ou criar conta</Link></Button></div></main>;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <ModuleHeader title="Progresso" />
      <section className="pb-5"><h2 className="font-display text-lg font-semibold">Evolução baseada nos seus registros</h2><p className="mt-2 text-sm text-steel">Veja sua evolução com o tempo. Registros pessoais não substituem orientação de profissional.</p>{workoutHistory.length === 0 && entries.length === 0 && <p className="mt-3 rounded-lg bg-brand/10 px-3 py-2 text-sm font-medium text-brand-deep">Registre seu primeiro treino pra ver a evolução aqui</p>}</section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Rotina semanal", `${pct}%`, `${done.length} de ${all.length} blocos`], ["Treinos concluídos", `${workoutHistory.length}`, "histórico total"], ["Volume registrado", `${totalVolume.toLocaleString("pt-BR")} kg`, "nos treinos"], ["Calorias planejadas", mealSummary(all, getMeal).kcal.toLocaleString("pt-BR"), "semana atual"]].map(([title, stat, detail]) => <article key={title} className="rounded-lg bg-card p-4 ring-1 ring-line"><p className="text-[11px] uppercase text-steel">{title}</p><p className="mt-2 font-display text-2xl font-semibold">{stat}</p><p className="mt-1 text-xs text-steel">{detail}</p></article>)}</div>
      <section className="mt-7 border-t border-line pt-6" aria-labelledby="weekly-goals-title">
        <div className="mb-4"><h2 id="weekly-goals-title" className="font-display text-xl font-semibold">Metas da semana</h2><p className="text-sm text-steel">Compare com a semana passada e ajuste quando quiser.</p></div>
        <div className="grid gap-5 md:grid-cols-3">{goalRows.map((row) => { const goal = weeklyGoalProgress(row.value, row.target); return <div key={row.key} className="border-b border-line pb-4"><label className="flex items-center justify-between gap-3 text-sm font-medium"><span>{row.label}</span><input type="number" min="0" max="7" value={row.target} onChange={(event) => setWeeklyGoals({ ...weeklyGoals, [row.key]: Math.min(7, Math.max(0, Number(event.target.value) || 0)) })} className="h-9 w-14 rounded-md bg-background px-2 text-center ring-1 ring-line" aria-label={`Meta de ${row.label.toLowerCase()}`} /></label><p className="mt-3 text-sm">{row.value} de {row.target} · {goal.status}{row.target > 0 && ` · ${goal.percent}%`}</p><div className="relative mt-2 h-2 rounded-full bg-mist" role="progressbar" aria-label={row.label} aria-valuenow={row.value} aria-valuemin={0} aria-valuemax={Math.max(row.target, row.value, 1)}><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, goal.percent)}%` }} />{goal.excess > 0 && <div className="absolute inset-x-0 top-3 h-1 rounded-full bg-mist"><div className="h-full rounded-full bg-good transition-all" style={{ width: `${Math.min(100, goal.percent - 100)}%` }} /></div>}</div><p className="mt-4 text-xs text-steel">Semana anterior: {row.previous} · {row.value > row.previous ? "acima" : row.value < row.previous ? "abaixo" : "igual"}</p></div>; })}</div>
      </section>
      <div className="mt-5 grid gap-5 lg:grid-cols-[340px_1fr]">
        <form noValidate onSubmit={addEntry} className="rounded-lg bg-card p-5 ring-1 ring-line"><h2 className="font-display text-lg font-semibold">Novo registro</h2><div className="mt-4 space-y-4"><label className="block text-sm font-medium">Tipo<select value={kind} onChange={(event) => { const next = event.target.value as keyof typeof kinds; setKind(next); setDetail(""); setValueError(null); }} className="mt-1.5 h-10 w-full rounded-md bg-background px-3 font-normal ring-1 ring-line">{Object.entries(kinds).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label><label className="block text-sm font-medium">Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-md bg-background px-3 font-normal ring-1 ring-line" /></label><label className="block text-sm font-medium">Detalhe (opcional)<input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder={kinds[kind].detail} className="mt-1.5 h-10 w-full rounded-md bg-background px-3 font-normal ring-1 ring-line" /></label><label className="block text-sm font-medium">Valor ({kinds[kind].unit})<input type="number" min="0.01" step="any" placeholder={kinds[kind].placeholder} aria-invalid={Boolean(valueError)} aria-describedby={valueError ? "progress-value-error" : undefined} value={value} onChange={(event) => { setValue(event.target.value); setValueError(null); }} className="mt-1.5 h-10 w-full rounded-md bg-background px-3 font-normal ring-1 ring-line" />{valueError && <span id="progress-value-error" role="alert" className="mt-1 block text-xs text-destructive">{valueError}</span>}</label><label className="block text-sm font-medium">Observações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1.5 min-h-20 w-full rounded-md bg-background p-3 font-normal ring-1 ring-line" /></label><Button className="w-full"><Plus /> Salvar registro</Button></div></form>
        <section className="rounded-lg bg-card p-5 ring-1 ring-line">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Tendência de {kinds[kind].label.toLocaleLowerCase("pt-BR")}</h2><p className="mt-1 text-xs text-steel">{latest ? `Último: ${Number(latest.value).toLocaleString("pt-BR")} ${latest.unit} · variação ${delta >= 0 ? "+" : ""}${delta.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}` : "Adicione registros para visualizar a evolução."}</p></div><div className="flex gap-1">{([7, 30, 90] as const).map((days) => <Button key={days} size="sm" variant={period === days ? "default" : "outline"} onClick={() => setPeriod(days)}>{days} dias</Button>)}</div></div>
          <div className="mt-4 flex flex-wrap gap-1.5">{Object.entries(kinds).map(([key, item]) => <Button key={key} size="sm" variant={kind === key ? "default" : "outline"} onClick={() => setKind(key as keyof typeof kinds)}>{item.label}</Button>)}</div>
          {loading ? <div className="mt-6 h-64 animate-pulse rounded-lg bg-mist" /> : !yAxis || !xAxis ? <p className="mt-6 text-sm text-steel">Nenhum registro nesse período. Registre para ver sua evolução.</p> : <ChartContainer config={chartConfig} className="mt-5 h-72 w-full aspect-auto"><LineChart data={chartData} margin={{ left: 4, right: 16, top: 12 }}><CartesianGrid vertical={false} /><XAxis dataKey="timestamp" type="number" scale="time" domain={xAxis.domain} ticks={xAxis.ticks} minTickGap={24} tickFormatter={(timestamp) => format(new Date(timestamp), "dd/MM")} tickLine={false} axisLine={false} /><YAxis domain={yAxis.domain} ticks={yAxis.ticks} allowDataOverflow tickFormatter={(number) => `${Number(number).toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ${axisUnit}`} tickLine={false} axisLine={false} width={76} /><ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => { const timestamp = payload[0]?.payload?.timestamp; return typeof timestamp === "number" ? format(new Date(timestamp), "dd/MM/yyyy") : ""; }} formatter={(value, _, item) => <span>{Number(value).toLocaleString("pt-BR")} {item.payload?.unit ?? axisUnit}</span>} />} /><Line dataKey="value" type="linear" stroke="var(--color-value)" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} /></LineChart></ChartContainer>}
          <div className="mt-5 border-t border-line pt-4"><h3 className="text-sm font-semibold">Registros recentes</h3>{filtered.length === 0 ? <p className="mt-3 text-sm text-steel">Registre sua primeira sessão pra ver a evolução aqui.</p> : <ul className="mt-2 divide-y divide-line">{[...filtered].reverse().slice(0, 8).map((entry) => <li key={entry.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{entry.label}</p><p className="text-xs text-steel">{format(parseISO(entry.entry_date), "dd 'de' MMMM", { locale: ptBR })}{entry.notes ? ` · ${entry.notes}` : ""}</p></div><div className="flex items-center gap-2"><span className="text-sm font-semibold">{Number(entry.value).toLocaleString("pt-BR")} {entry.unit}</span><Button variant="ghost" size="icon" className="size-7" onClick={() => removeEntry(entry.id)} aria-label="Remover registro"><Trash2 /></Button></div></li>)}</ul>}</div>
        </section>
      </div>
    </main>
  );
}