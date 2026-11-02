import { ModuleHeader } from "@/components/ModuleHeader";
import { ConsistencyCard } from "@/components/ConsistencyCard";
import { LevelCard } from "@/components/LevelCard";
import { ReadingGoalBar } from "@/components/ReadingGoalBar";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";
import { useEntryState } from "@/lib/navigation-context";
import { format, isAfter, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, Dumbbell, Scale, TrendingUp, UtensilsCrossed, Weight } from "lucide-react";
import { EmptyState, ModuleGate } from "@/components/EmptyState";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { mealSummary } from "@/lib/meal-summary";
import { toDateKey } from "@/lib/calendar-utils";
import { isModuleOn } from "@/lib/modules";
import { useRoutineProgress } from "@/lib/use-routine-progress";
import { progressKinds as kinds, progressChartData, progressXAxis, progressYAxis } from "@/lib/progress";
import { useProgressEntries } from "@/lib/use-progress-entries";

export const Route = createFileRoute("/progresso")({
  head: () => ({ meta: [
    { title: "Meu progresso — TaskBio" },
    { name: "description", content: "Acompanhe rotina, treinos, alimentação e peso por período, num painel só de leitura." },
    { property: "og:title", content: "Meu progresso — TaskBio" },
    { property: "og:description", content: "Gráficos de evolução, consistência e histórico de atividades." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Progresso,
});

const chartConfig = { value: { label: "Valor", color: "var(--brand)" } } satisfies ChartConfig;

type Origin = { to: "/treino" | "/alimentacao" | "/saude" | "/agenda"; hash?: string; name: string };
const kindOrigin: Record<keyof typeof kinds, Origin> = {
  weight: { to: "/saude", hash: "registros-saude", name: "Saúde" },
  measurement: { to: "/saude", hash: "registros-saude", name: "Saúde" },
  strength: { to: "/treino", hash: "registros-treino", name: "Treino" },
  run: { to: "/treino", hash: "registros-treino", name: "Treino" },
  consistency: { to: "/agenda", hash: "registros-agenda", name: "Agenda" },
};

function OriginLink({ origin, empty }: { origin: Origin; empty?: boolean }) {
  if (origin.to === "/agenda") return null; // consistency is server-calculated, never typed in Agenda
  return <Link to={origin.to} {...(origin.hash ? { hash: origin.hash } : {})} className="mt-3 inline-block text-xs font-medium text-brand-deep underline-offset-4 hover:underline">{empty ? "Registrar" : "Ver"} em {origin.name}</Link>;
}

function MetricCard({ icon, value, label, origin, emptyText }: { icon: ReactNode; value: string | null; label: string; origin: Origin; emptyText: string }) {
  return <article className="flex flex-col rounded-lg bg-card p-4 ring-1 ring-line"><span className="text-steel">{icon}</span>{value === null ? <p className="mt-2 text-sm text-steel">{emptyText}</p> : <><p className="mt-2 font-display text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-steel">{label}</p></>}<div className="mt-auto"><OriginLink origin={origin} empty={value === null} /></div></article>;
}

function Progresso() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { plan, workoutHistory, getMeal, modules } = useTaskBio();
  const { entries, loading } = useProgressEntries();
  const [period, setPeriod] = useEntryState<7 | 30 | 90>("progress:period", 30);
  const [kind, setKind] = useEntryState<keyof typeof kinds>("progress:kind", "weight");
  const routine = useRoutineProgress(period);

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

  const cutoff = subDays(new Date(), period);
  const cutoffKey = toDateKey(cutoff);
  const workouts = workoutHistory.filter((w) => isAfter(parseISO(w.completedAt), cutoff));
  const volume = workouts.reduce((sum, w) => sum + w.totalVolumeKg, 0);
  const periodBlocks = Object.entries(plan).filter(([day]) => day > cutoffKey && day <= toDateKey(new Date())).flatMap(([, blocks]) => blocks);
  const kcal = mealSummary(periodBlocks, getMeal).kcal;
  const weights = entries.filter((e) => e.kind === "weight" && isAfter(parseISO(e.entry_date), cutoff)).sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const lastWeight = weights.at(-1);
  const weightDelta = lastWeight && weights[0] ? Number(lastWeight.value) - Number(weights[0].value) : 0;
  const fmt = (n: number, digits = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });

  const pct = routine.data?.pct ?? null;
  const routineLabel = `Rotina dos últimos ${period} dias`;

  if (!authLoading && !user) return <main className="mx-auto max-w-4xl px-5 pb-16"><ModuleHeader title="Progresso" /><div className="pt-8 text-center"><Activity className="mx-auto size-9 text-brand-deep" /><h2 className="mt-4 font-display text-2xl font-semibold">Seu progresso começa com sua conta</h2><p className="mx-auto mt-2 max-w-lg text-sm text-steel">Entre pra guardar seus registros e ver sua evolução.</p><Button asChild className="mt-6"><Link to="/auth">Entrar ou criar conta</Link></Button></div></main>;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <ModuleHeader title="Progresso" />
      <ModuleGate id="progresso">
      <div className="pb-5"><LevelCard /></div>
      <section className="flex flex-wrap items-end justify-between gap-3 pb-5"><div><h2 className="font-display text-lg font-semibold">Evolução baseada nos seus registros</h2></div><div className="flex gap-1" role="group" aria-label="Período">{([7, 30, 90] as const).map((days) => <Button key={days} size="sm" variant={period === days ? "default" : "outline"} onClick={() => setPeriod(days)}>{days} dias</Button>)}</div></section>

      {!loading && entries.length === 0 && workoutHistory.length === 0 && <EmptyState icon={TrendingUp} title="Ainda sem dados para comparar" context="Registre treino, peso ou medidas e o progresso aparece aqui." actionLabel="Registrar medida" onAction={() => void navigate({ to: "/saude", hash: "registros-saude" })} secondaryLabel="Ver metas da semana" onSecondary={() => void navigate({ to: "/agenda" })} />}

      <ConsistencyCard period={period} />
      <ReadingGoalBar />

      {/* Rotina pessoal: resumo dos blocos do próprio usuário. */}
      <section aria-label={routineLabel} className="mt-4 rounded-lg bg-card p-4 ring-1 ring-line">
        <p className="text-sm font-medium text-steel">{routineLabel}</p>
        {routine.isPending ? <div className="mt-3 h-14 w-32 animate-pulse rounded-lg bg-mist" /> : pct === null ? <>
          <p className="mt-2 font-display text-2xl font-semibold text-steel">—</p>
          <p className="mt-2 text-sm text-steel">{period === 7 ? "Sem blocos previstos nesta semana" : "Sem blocos previstos neste período"}</p>
        </> : <>
          <p className="mt-2 font-display text-2xl font-semibold">{pct}%</p>
          <p className="mt-2 text-sm text-steel">{routine.data?.done ?? 0} de {routine.data?.planned ?? 0} blocos concluídos</p>
          <div className="mt-3 h-2 rounded-full bg-mist" role="progressbar" aria-label={routineLabel} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, pct)}%` }} /></div>
        </>}
        <OriginLink origin={{ to: "/agenda", name: "Agenda" }} />
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isModuleOn(modules, "treino") && <MetricCard icon={<Dumbbell className="size-4" />} value={workouts.length ? `${workouts.length}` : null} label="Treinos concluídos" origin={{ to: "/treino", name: "Treino" }} emptyText="Nenhum treino concluído neste período" />}
        {isModuleOn(modules, "alimentacao") && <MetricCard icon={<UtensilsCrossed className="size-4" />} value={kcal > 0 ? `${kcal.toLocaleString("pt-BR")} kcal` : null} label="Calorias planejadas" origin={{ to: "/alimentacao", name: "Alimentação" }} emptyText="Nenhuma refeição planejada neste período" />}
        {isModuleOn(modules, "treino") && <MetricCard icon={<Weight className="size-4" />} value={volume > 0 ? `${volume.toLocaleString("pt-BR")} kg` : null} label="Volume registrado" origin={{ to: "/treino", name: "Treino" }} emptyText="Nenhum volume registrado neste período" />}
        {isModuleOn(modules, "saude") && <MetricCard icon={<Scale className="size-4" />} value={lastWeight ? `${fmt(Number(lastWeight.value))} kg` : null} label={`Tendência de peso · ${weightDelta >= 0 ? "+" : ""}${fmt(weightDelta, 2)} kg`} origin={{ to: "/saude", hash: "registros-saude", name: "Saúde" }} emptyText="Nenhum peso registrado neste período" />}
      </div>

      <section className="mt-6 rounded-lg bg-card p-5 ring-1 ring-line">
        <div><h2 className="font-display text-lg font-semibold">Tendência de {kinds[kind].label.toLocaleLowerCase("pt-BR")}</h2><p className="mt-1 text-xs text-steel">{latest ? `Último: ${Number(latest.value).toLocaleString("pt-BR")} ${latest.unit} · variação ${delta >= 0 ? "+" : ""}${delta.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}` : `Nenhum registro de ${kinds[kind].label.toLocaleLowerCase("pt-BR")} neste período.`}</p></div>
        <div className="mt-4 flex flex-wrap gap-1.5">{Object.entries(kinds).map(([key, item]) => <Button key={key} size="sm" variant={kind === key ? "default" : "outline"} onClick={() => setKind(key as keyof typeof kinds)}>{item.label}</Button>)}</div>
        {loading ? <div className="mt-6 h-64 animate-pulse rounded-lg bg-mist" /> : !yAxis || !xAxis ? <p className="mt-6 text-sm text-steel">Nenhum registro nesse período · <OriginLink origin={kindOrigin[kind]} empty /></p> : <ChartContainer config={chartConfig} className="mt-5 h-72 w-full aspect-auto"><LineChart data={chartData} margin={{ left: 4, right: 16, top: 12 }}><CartesianGrid vertical={false} /><XAxis dataKey="timestamp" type="number" scale="time" domain={xAxis.domain} ticks={xAxis.ticks} minTickGap={24} tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" })} tickLine={false} axisLine={false} /><YAxis domain={yAxis.domain} ticks={yAxis.ticks} allowDataOverflow tickFormatter={(number) => `${Number(number).toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ${axisUnit}`} tickLine={false} axisLine={false} width={76} /><ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => { const timestamp = payload[0]?.payload?.timestamp; return typeof timestamp === "number" ? new Date(timestamp).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : ""; }} formatter={(value, _, item) => <span>{Number(value).toLocaleString("pt-BR")} {item.payload?.unit ?? axisUnit}</span>} />} /><Line dataKey="value" type="linear" stroke="var(--color-value)" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} /></LineChart></ChartContainer>}
        {filtered.length > 0 && <div className="mt-5 border-t border-line pt-4"><h3 className="text-sm font-semibold">Registros recentes</h3><ul className="mt-2 divide-y divide-line">{[...filtered].reverse().slice(0, 8).map((entry) => <li key={entry.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{entry.label}</p><p className="text-xs text-steel">{format(parseISO(entry.entry_date), "dd 'de' MMMM", { locale: ptBR })}{entry.notes ? ` · ${entry.notes}` : ""}</p></div><span className="text-sm font-semibold">{Number(entry.value).toLocaleString("pt-BR")} {entry.unit}</span></li>)}</ul><OriginLink origin={kindOrigin[kind]} /></div>}
      </section>
      </ModuleGate>
    </main>
  );
}
