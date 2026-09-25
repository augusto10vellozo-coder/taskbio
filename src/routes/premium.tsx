import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Crown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/premium")({
  head: () => ({ meta: [
    { title: "Trilha Premium — planos mensal e anual" },
    { name: "description", content: "Conheça os planos Trilha Premium para ampliar seu planejamento e acompanhar sua evolução." },
    { property: "og:title", content: "Trilha Premium" },
    { property: "og:description", content: "Planejamento completo por R$ 9,90 ao mês ou R$ 79,90 ao ano." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PremiumPage,
});

const benefits = ["Biblioteca completa de atividades", "Planejamento alimentar e receitas", "Lista de compras automática", "Histórico e gráficos avançados", "Sincronização e personalização ampliadas"];

function PremiumPage() {
  const { user } = useAuth();
  return <main className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8">
    <section className="max-w-2xl"><span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-deep"><Crown className="size-4" /> Trilha Premium</span><h1 className="mt-4 font-display text-4xl font-semibold sm:text-5xl">Mais recursos para uma rotina que cabe na sua vida.</h1><p className="mt-4 text-steel">Os planos estão configurados em ambiente de teste. Nenhuma cobrança real será feita enquanto a operação comercial não estiver validada.</p></section>
    <section className="mt-10 grid gap-4 md:grid-cols-2">
      <Plan title="Mensal" price="R$ 9,90" suffix="por mês" action={user ? "Disponível em breve" : "Entrar para acompanhar"} annual={false} />
      <Plan title="Anual" price="R$ 79,90" suffix="por ano" action={user ? "Disponível em breve" : "Entrar para acompanhar"} annual />
    </section>
    <div className="mt-6 flex items-start gap-3 rounded-lg bg-mist p-4 text-sm text-steel"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-good" /><p>Cancelamento pelo portal seguro de pagamentos, com acesso mantido até o fim do período já pago. Consulte os <Link to="/termos" className="font-medium text-ink underline">termos</Link> e a <Link to="/reembolso" className="font-medium text-ink underline">política de reembolso</Link>.</p></div>
  </main>;
}

function Plan({ title, price, suffix, action, annual }: { title: string; price: string; suffix: string; action: string; annual: boolean }) { return <article className={`rounded-lg bg-card p-6 ring-1 ${annual ? "ring-brand" : "ring-line"}`}>{annual && <p className="mb-3 text-xs font-semibold uppercase text-brand-deep">Economize R$ 38,90 por ano</p>}<h2 className="font-display text-2xl font-semibold">{title}</h2><p className="mt-3"><span className="font-display text-4xl font-semibold">{price}</span> <span className="text-sm text-steel">{suffix}</span></p><ul className="my-6 space-y-3">{benefits.map((benefit) => <li key={benefit} className="flex gap-2 text-sm"><Check className="size-4 shrink-0 text-good" />{benefit}</li>)}</ul><Button asChild variant={annual ? "default" : "outline"} className="w-full"><Link to="/auth">{action}</Link></Button></article>; }