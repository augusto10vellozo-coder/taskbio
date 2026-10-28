import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brasiliaDay } from "@/lib/xp";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Score = { score: number | null; training_on: boolean; meals_on: boolean; training_done: number; training_planned: number; meals_done: number; meals_planned: number; sleep_days: number };
const shift = (day: string, n: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const pct = (done: number, planned: number) => (planned > 0 ? Math.round((done / planned) * 100) : null);

/** Highlight slot of Progresso: server-computed consistency score (training + meals, sleep only adds). */
export function ConsistencyCard({ period }: { period: 7 | 30 | 90 }) {
  const { user } = useAuth();
  const today = brasiliaDay(new Date());
  const start = shift(today, -(period - 1));
  const q = useQuery({
    queryKey: ["consistency-score", user?.id, period, today],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("consistency_score", { _start: start, _end: today }).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Score | null;
    },
  });
  const label = `Consistência dos últimos ${period} dias`;
  const d = q.data;
  if (d && !d.training_on && !d.meals_on) {
    return <section className="rounded-2xl bg-card p-6 ring-1 ring-line sm:p-8"><p className="text-sm font-medium text-steel">{label}</p><p className="mt-3 text-base">Ative Treino ou Alimentação para ver sua consistência</p></section>;
  }
  const t = d?.training_on ? pct(d.training_done, d.training_planned) : null;
  const m = d?.meals_on ? pct(d.meals_done, d.meals_planned) : null;
  const sleep = d?.sleep_days ? Math.min(10, d.sleep_days) : 0;
  const parts = [t !== null && `Treino ${t}%`, m !== null && `Alimentação ${m}%`, sleep > 0 && `+${sleep} de sono`].filter(Boolean).join(" · ");
  const score = d?.score ?? null;
  const fmtDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button type="button" aria-label={`${label}: ${score ?? "sem nota"}. Ver detalhes`} className="block w-full rounded-2xl bg-card p-6 text-left ring-1 ring-line transition hover:ring-brand sm:p-8">
          <p className="text-sm font-medium text-steel">{label}</p>
          {q.isPending ? <div className="mt-3 h-14 w-32 animate-pulse rounded-lg bg-mist" /> : score === null ? <>
            <p className="mt-2 font-display text-6xl font-semibold text-steel">—</p>
            <p className="mt-2 text-sm text-steel">{q.isError ? "Não foi possível carregar agora" : "Sem blocos previstos no período"}</p>
          </> : <>
            <p className="mt-2 font-display font-semibold"><span className="text-6xl">{score}</span><span className="text-xl text-steel">/100</span></p>
            <p className="mt-2 text-sm text-steel">{parts}</p>
            <div className="mt-4 h-3 rounded-full bg-mist" role="progressbar" aria-label={label} aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-brand" style={{ width: `${score}%` }} /></div>
          </>}
          <p className="mt-3 text-xs font-medium text-brand-deep">Entenda sua nota</p>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl pb-28">
        <SheetHeader className="text-left">
          <SheetTitle>Consistência{score !== null ? `: ${score}/100` : ""}</SheetTitle>
          <SheetDescription>Sua consistência combina o que você planejou com o que você concluiu no treino e na alimentação. Dormir bem soma um bônus — mas nunca tira pontos.</SheetDescription>
        </SheetHeader>
        <ul className="mt-4 space-y-2 px-4 text-sm">
          {d?.training_on && <li>Treino: {t === null ? "sem treinos previstos" : `${t}% (${d.training_done} de ${d.training_planned} treinos)`}</li>}
          {d?.meals_on && <li>Alimentação: {m === null ? "sem refeições planejadas" : `${m}% (${d.meals_done} de ${d.meals_planned} refeições)`}</li>}
          <li>Sono: +{sleep} ({d?.sleep_days ?? 0} {d?.sleep_days === 1 ? "dia" : "dias"} dentro da meta)</li>
          <li className="text-steel">Período: {fmtDay(start)} a {fmtDay(today)}</li>
        </ul>
      </SheetContent>
    </Sheet>
  );
}
