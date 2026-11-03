import { createFileRoute, Link } from "@tanstack/react-router";
import { ContentCta } from "@/components/ContentCta";

const STEPS = [
  {
    title: "Liste o que precisa estudar",
    text: "Escreva as matérias do seu objetivo, sem detalhar tópicos ainda. Se for concurso, use o edital; se for faculdade, use as disciplinas do semestre. O importante é ter a lista fechada antes de distribuir tempo.",
  },
  {
    title: "Descubra quantas horas você realmente tem",
    text: "Não use o número ideal. Olhe a última semana e conte quantas horas livres sobraram de verdade. Um cronograma de 20 horas que você cumpre vale mais que um de 40 que você abandona.",
  },
  {
    title: "Distribua em blocos curtos e fixos",
    text: "Sessões de 45 a 60 minutos, sempre no mesmo horário, funcionam melhor que blocos longos e irregulares. Alterne as matérias ao longo da semana em vez de concentrar uma só.",
  },
  {
    title: "Coloque na agenda, não na planilha",
    text: "Cronograma que fica em arquivo separado compete com a vida real. Coloque cada sessão no mesmo calendário onde estão seus compromissos, para que o dia mostre tudo junto.",
  },
  {
    title: "Programe a revisão antes de esquecer",
    text: "Cada sessão deve gerar revisões em 1, 7 e 30 dias. Sem isso, boa parte do que você estudou se perde em poucos dias. Se você usa o TaskBio, elas são criadas automaticamente.",
  },
  {
    title: "Ajuste toda semana",
    text: "Reserve um horário livre por semana para o que ficou para trás. Isso evita que um dia perdido derrube o plano inteiro, que é como a maioria dos cronogramas morre.",
  },
];

const FAQ = [
  {
    q: "Quantas horas por dia devo estudar?",
    a: "Depende do tempo real disponível, não de um número ideal. Comece com o que você consegue cumprir por duas semanas seguidas e aumente depois. Constância vale mais que volume.",
  },
  {
    q: "É melhor um ciclo de estudos ou uma agenda semanal?",
    a: "A agenda semanal é mais fácil de cumprir porque cabe nos dias reais. O ciclo funciona melhor para quem já tem rotina estável e muitas matérias.",
  },
  {
    q: "Como não esquecer o que estudei?",
    a: "Revisando em intervalos crescentes: 1 dia, 7 dias e 30 dias depois. É o método mais estudado e o mais simples de aplicar.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "HowTo",
      name: "Como montar um cronograma de estudos que você consiga cumprir",
      step: STEPS.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.title,
        text: step.text,
      })),
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

export const Route = createFileRoute("/cronograma-de-estudos")({
  head: () => ({
    meta: [
      { title: "Como montar um cronograma de estudos que funciona | TaskBio" },
      {
        name: "description",
        content:
          "Passo a passo para montar um cronograma de estudos realista: horas reais, blocos curtos, agenda e revisão em 1, 7 e 30 dias. Com exemplo de semana.",
      },
      { property: "og:title", content: "Como montar um cronograma de estudos que você consegue cumprir" },
      { property: "og:description", content: "Seis passos para um cronograma realista, com exemplo de semana e revisão espaçada." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://taskbio.com.br/cronograma-de-estudos" }],
  }),
  component: Page,
});

function Page() {
  return (
    <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-deep">Guia</p>
      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
        Como montar um cronograma de estudos que você consiga cumprir
      </h1>
      <p className="mt-4 text-base leading-7 text-steel">
        Montar um cronograma é fácil. Cumprir é a parte difícil. Este guia mostra seis passos para criar
        um plano que sobrevive à segunda semana — que é onde a maioria desiste.
      </p>

      <div className="mt-8 rounded-xl bg-brand-soft p-5">
        <p className="text-sm font-semibold text-brand-deep">O erro mais comum</p>
        <p className="mt-1.5 text-sm leading-6 text-steel">
          Planejar para o dia ideal. Você reserva 4 horas, mas tem 1h30 de verdade. Na primeira semana dá
          certo; na segunda, o plano já está atrasado e você desiste.
        </p>
      </div>

      <ol className="mt-10 space-y-8">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <h2 className="font-display text-2xl font-semibold">
              <span className="mr-2 text-brand-deep">{index + 1}.</span>
              {step.title}
            </h2>
            <p className="mt-2 text-base leading-7 text-steel">{step.text}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 font-display text-2xl font-semibold">Exemplo de semana</h2>
      <p className="mt-3 text-base leading-7 text-steel">
        Cinco matérias, uma pessoa que trabalha e tem cerca de uma hora por dia:
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-line">
        <table className="w-full min-w-96 text-left text-sm">
          <thead className="bg-mist text-steel">
            <tr>
              <th className="px-4 py-3 font-medium">Dia</th>
              <th className="px-4 py-3 font-medium">Sessão</th>
              <th className="px-4 py-3 font-medium">Tempo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[
              ["Segunda", "Português", "60 min"],
              ["Terça", "Direito Previdenciário", "60 min"],
              ["Quarta", "Português", "60 min"],
              ["Quinta", "Raciocínio Lógico", "45 min"],
              ["Sexta", "Revisão da semana", "45 min"],
              ["Sábado", "Simulado ou questões", "90 min"],
              ["Domingo", "Livre (reserva para atrasos)", "—"],
            ].map(([day, session, time]) => (
              <tr key={day}>
                <td className="px-4 py-2.5 font-medium text-ink">{day}</td>
                <td className="px-4 py-2.5 text-steel">{session}</td>
                <td className="px-4 py-2.5 text-steel">{time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm leading-6 text-steel">
        Repare no domingo vazio: ele não é folga, é a válvula de escape. É o que impede um imprevisto de
        derrubar o plano todo.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold">Perguntas frequentes</h2>
      <dl className="mt-4 space-y-5">
        {FAQ.map((item) => (
          <div key={item.q}>
            <dt className="text-base font-semibold text-ink">{item.q}</dt>
            <dd className="mt-1 text-base leading-7 text-steel">{item.a}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-8 text-base leading-7 text-steel">
        Se quiser entender o que um app precisa fazer para sustentar esse plano, veja{" "}
        <Link to="/app-rotina-de-estudos" className="font-medium text-brand-deep underline underline-offset-4">
          app de rotina de estudos: o que resolve de verdade
        </Link>
        .
      </p>

      <ContentCta title="Monte esse cronograma em 2 minutos" />
    </main>
  );
}
