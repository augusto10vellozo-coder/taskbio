import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { userRpc } from "@/lib/user-rpc";

type Activation = { event: string; users: number };
type Cohort = { cohort_day: string; cohort_size: number; d1: number; d7: number };

const LABEL: Record<string, string> = {
  day_active: "Abriram o app",
  onboarding_done: "Concluíram o onboarding",
  week_example_used: "Usaram semana de exemplo",
  workout_imported: "Importaram um treino",
  first_block_done: "Concluíram o primeiro item",
};

const pct = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : "—");

/** Activation funnel and retention cohorts for the team area. Admin only (enforced by the RPCs). */
export function ProductMetrics() {
  const [activation, setActivation] = useState<Activation[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      userRpc<Activation[]>(supabase, "product_activation"),
      userRpc<Cohort[]>(supabase, "product_retention", { _days: 30 }),
    ]).then(([a, c]) => {
      if (!active) return;
      if (a.error || c.error) {
        setError("Não foi possível carregar as métricas de produto.");
        setLoading(false);
        return;
      }
      setActivation((a.data ?? []).map((row) => ({ ...row, users: Number(row.users) })));
      setCohorts((c.data ?? []).map((row) => ({
        cohort_day: row.cohort_day,
        cohort_size: Number(row.cohort_size),
        d1: Number(row.d1),
        d7: Number(row.d7),
      })));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <p className="text-sm text-steel">Carregando métricas…</p>;
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;

  const base = activation.find((row) => row.event === "day_active")?.users ?? 0;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-2xl font-semibold">Ativação</h2>
        <p className="mt-1 text-sm text-steel">Usuários distintos que realizaram cada ação, desde o início.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {activation.length === 0 && <p className="text-sm text-steel">Ainda não há eventos registrados.</p>}
          {activation.map((row) => (
            <div key={row.event} className="rounded-lg bg-card p-4 ring-1 ring-line">
              <p className="text-xs text-steel">{LABEL[row.event] ?? row.event}</p>
              <p className="mt-1 font-display text-3xl font-semibold">{row.users}</p>
              {row.event !== "day_active" && base > 0 && <p className="text-xs text-steel">{pct(row.users, base)} dos ativos</p>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold">Retenção por coorte</h2>
        <p className="mt-1 text-sm text-steel">Da turma que apareceu no dia indicado, quantos voltaram 1 e 7 dias depois. Últimos 30 dias.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-96 text-left text-sm">
            <thead className="border-b border-line text-steel">
              <tr><th className="py-3">Entrada</th><th className="py-3 text-right">Pessoas</th><th className="py-3 text-right">D1</th><th className="py-3 text-right">D7</th></tr>
            </thead>
            <tbody>
              {cohorts.length === 0 && <tr><td colSpan={4} className="py-4 text-steel">Sem dados suficientes.</td></tr>}
              {cohorts.map((row) => (
                <tr key={row.cohort_day} className="border-b border-line">
                  <td className="py-3">{row.cohort_day.split("-").reverse().join("/")}</td>
                  <td className="py-3 text-right">{row.cohort_size}</td>
                  <td className="py-3 text-right">{row.d1} <span className="text-xs text-steel">({pct(row.d1, row.cohort_size)})</span></td>
                  <td className="py-3 text-right">{row.d7} <span className="text-xs text-steel">({pct(row.d7, row.cohort_size)})</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-steel">
          Referência: acima de 25% no D7 é um bom sinal de retenção para um app de rotina. Abaixo de 10% indica que o problema é o produto, não o público.
        </p>
      </section>
    </div>
  );
}
