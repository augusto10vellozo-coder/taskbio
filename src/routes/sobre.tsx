import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/components/AdSlot";

export const Route = createFileRoute("/sobre")({
  head: () => ({ meta: [
    { title: "Sobre o Trilha — Organização de vida saudável" },
    { name: "description", content: "Conheça o Trilha, uma ferramenta gratuita para organizar agenda, atividades físicas, refeições e progresso." },
    { property: "og:title", content: "Sobre o Trilha — Organização de vida saudável" },
    { property: "og:description", content: "Uma agenda para integrar compromissos, movimento e alimentação no dia a dia." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AboutPage,
});

function AboutPage() {
  return <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-8">
    <p className="text-xs font-medium uppercase text-brand-deep">Sobre o Trilha</p>
    <h1 className="mt-3 font-display text-4xl font-semibold">Sua vida saudável, em uma agenda só.</h1>
    <p className="mt-5 text-base leading-7 text-steel">O Trilha reúne compromissos, atividades físicas, refeições e descanso para que você enxergue sua rotina completa. O acesso é gratuito e você decide o que registrar.</p>
    <section className="mt-10 border-t border-line pt-7">
      <h2 className="font-display text-2xl font-semibold">O que você pode organizar</h2>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div><h3 className="font-semibold">Agenda e atividades</h3><p className="mt-2 text-sm leading-6 text-steel">Planeje seus dias, registre compromissos e monte treinos próprios. As modalidades apresentam exemplos para diferentes objetivos.</p></div>
        <div><h3 className="font-semibold">Alimentação e compras</h3><p className="mt-2 text-sm leading-6 text-steel">Escolha refeições para a semana, consulte estimativas de nutrientes e custos e organize a lista de compras.</p></div>
        <div><h3 className="font-semibold">Progresso</h3><p className="mt-2 text-sm leading-6 text-steel">Acompanhe seus registros de atividades e rotina ao longo do tempo, no seu próprio ritmo.</p></div>
        <div><h3 className="font-semibold">Privacidade</h3><p className="mt-2 text-sm leading-6 text-steel">Você pode exportar seus registros ou excluir sua conta pelo perfil. Consulte a <Link to="/privacidade" className="text-brand-deep underline">Política de Privacidade</Link>.</p></div>
      </div>
    </section>
    <p className="mt-8 border-t border-line pt-6 text-sm leading-6 text-steel">Informações nutricionais e exemplos de atividade são gerais e não substituem orientação de profissionais de saúde ou educação física.</p>
    <AdSlot page="/sobre" slot="about-inline" />
    <div className="mt-7 flex flex-wrap gap-3"><Button asChild><Link to="/auth">Criar conta gratuita</Link></Button><Button asChild variant="outline"><Link to="/contato">Fale com o Trilha</Link></Button></div>
  </main>;
}