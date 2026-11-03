import { createFileRoute, Link } from "@tanstack/react-router";
import { ContentCta } from "@/components/ContentCta";

const FAQ = [
  {
    q: "App de rotina de estudos funciona sem criar conta?",
    a: "No TaskBio, sim. Você monta a semana e usa no próprio aparelho. A conta serve para sincronizar entre celular e computador.",
  },
  {
    q: "Preciso pagar para usar?",
    a: "Não. O acesso é gratuito, sem plano pago e sem cartão.",
  },
  {
    q: "O app monta meu cronograma sozinho a partir do edital?",
    a: "Não. Ele organiza a semana a partir do que você escolhe: matérias, dias e duração. Montar o plano a partir do edital é o próximo passo do produto.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "TaskBio",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web, Android, iOS",
      url: "https://taskbio.com.br/app-rotina-de-estudos",
      description:
        "App gratuito de rotina de estudos com cronograma na agenda, revisão espaçada automática e progresso por matéria.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

export const Route = createFileRoute("/app-rotina-de-estudos")({
  head: () => ({
    meta: [
      { title: "App de rotina de estudos: o que resolve de verdade | TaskBio" },
      {
        name: "description",
        content:
          "App gratuito de rotina de estudos: cronograma que vira agenda, revisão de 1, 7 e 30 dias automática e progresso por matéria. Sem cadastro para testar.",
      },
      { property: "og:title", content: "App de rotina de estudos que você consegue cumprir" },
      { property: "og:description", content: "Cronograma na agenda, revisão automática e progresso por matéria. Grátis e sem cadastro." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://taskbio.com.br/app-rotina-de-estudos" }],
  }),
  component: Page,
});

function Page() {
  return (
    <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-deep">Rotina de estudos</p>
      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
        App de rotina de estudos: o que resolve de verdade
      </h1>
      <p className="mt-4 text-base leading-7 text-steel">
        Se você já montou um cronograma bonito e abandonou na terceira semana, o problema provavelmente
        não foi falta de vontade. Foi falta de um sistema que te cobrasse.
      </p>

      <h2 className="mt-10 font-display text-2xl font-semibold">O que um app de rotina precisa fazer</h2>
      <p className="mt-3 text-base leading-7 text-steel">Três coisas, nesta ordem:</p>
      <ol className="mt-4 space-y-3 text-base leading-7 text-steel">
        <li>
          <strong className="text-ink">Planejar a semana em blocos concretos.</strong> "Estudar mais" não
          é plano. "Português, terça e quinta, 19h, 60 minutos" é.
        </li>
        <li>
          <strong className="text-ink">Cobrar a execução.</strong> O plano precisa aparecer na sua agenda
          do dia, junto com as outras coisas da vida.
        </li>
        <li>
          <strong className="text-ink">Mostrar a verdade.</strong> Quantos dias você cumpriu, quanto tempo
          por matéria, o que está ficando para trás.
        </li>
      </ol>

      <h2 className="mt-10 font-display text-2xl font-semibold">Onde a maioria falha</h2>
      <p className="mt-3 text-base leading-7 text-steel">
        Planilhas e cadernos planejam, mas não cobram. Apps de cronômetro registram depois do fato: você
        estuda, então anota. Nenhum dos dois fecha o ciclo.
      </p>
      <p className="mt-3 text-base leading-7 text-steel">
        O resultado é sempre o mesmo: o plano vive num lugar e a rotina acontece em outro.
      </p>

      <h2 className="mt-10 font-display text-2xl font-semibold">Como o TaskBio faz</h2>
      <ul className="mt-4 space-y-3 text-base leading-7 text-steel">
        <li>
          <strong className="text-ink">Cronograma que vira agenda.</strong> Você escolhe matéria, dias e
          duração; cada bloco entra no seu dia.
        </li>
        <li>
          <strong className="text-ink">Concluir conta como estudo.</strong> Marcar o bloco registra a
          sessão com a matéria e o tempo certos.
        </li>
        <li>
          <strong className="text-ink">Revisão automática.</strong> Cada sessão agenda revisões em 1, 7 e
          30 dias, sem você precisar lembrar.
        </li>
        <li>
          <strong className="text-ink">Progresso por matéria.</strong> Minutos da semana contra o que está
          planejado, e a próxima prova com contagem regressiva.
        </li>
        <li>
          <strong className="text-ink">Sequência de dias.</strong> Um número simples que mostra se você
          está mantendo o ritmo.
        </li>
      </ul>

      <h2 className="mt-10 font-display text-2xl font-semibold">O que o TaskBio não faz</h2>
      <p className="mt-3 text-base leading-7 text-steel">
        Não monta plano a partir do edital, não tem banco de questões e não substitui curso ou professor.
        Se o seu problema é conteúdo, ele não resolve. Se o problema é constância, sim.
      </p>

      <h2 className="mt-10 font-display text-2xl font-semibold">Para quem faz sentido</h2>
      <p className="mt-3 text-base leading-7 text-steel">
        Para quem já sabe o que precisa estudar e perde o ritmo na segunda ou terceira semana. Para quem
        estuda, trabalha e precisa que o plano caiba no dia real, não no dia ideal.
      </p>

      <h2 className="mt-10 font-display text-2xl font-semibold">Perguntas frequentes</h2>
      <dl className="mt-4 space-y-5">
        {FAQ.map((item) => (
          <div key={item.q}>
            <dt className="text-base font-semibold text-ink">{item.q}</dt>
            <dd className="mt-1 text-base leading-7 text-steel">{item.a}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-8 text-base leading-7 text-steel">
        Se quiser o passo a passo de como montar o cronograma, leia{" "}
        <Link to="/cronograma-de-estudos" className="font-medium text-brand-deep underline underline-offset-4">
          como montar um cronograma de estudos que você consiga cumprir
        </Link>
        .
      </p>

      <ContentCta title="Monte sua primeira semana" />
    </main>
  );
}
