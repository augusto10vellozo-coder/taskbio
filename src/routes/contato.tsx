import { createFileRoute } from "@tanstack/react-router";
import { AdSlot } from "@/components/AdSlot";

export const Route = createFileRoute("/contato")({
  head: () => ({ meta: [
    { title: "Contato — TaskBio" },
    { name: "description", content: "Fale com o TaskBio pelo e-mail contatotaskbio@gmail.com para dúvidas, suporte e privacidade." },
    { property: "og:title", content: "Contato — TaskBio" },
    { property: "og:description", content: "O e-mail contatotaskbio@gmail.com é o canal oficial de atendimento do TaskBio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ContactPage,
});

function ContactPage() {
  return <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-8">
    <p className="text-xs font-medium uppercase text-brand-deep">TaskBio</p>
    <h1 className="mt-3 font-display text-4xl font-semibold">Contato</h1>
    <p className="mt-5 text-base leading-7 text-steel">Dúvidas sobre o TaskBio, sugestões ou solicitações relacionadas aos seus dados? Escreva para o nosso e-mail — é o canal oficial de atendimento.</p>
    <div className="mt-9 border-y border-line py-8">
      <h2 className="font-display text-lg font-semibold">E-mail</h2>
      <a href="mailto:contatotaskbio@gmail.com" className="mt-2 block break-all font-display text-xl font-semibold text-brand-deep underline">contatotaskbio@gmail.com</a>
      <p className="mt-3 text-sm leading-6 text-steel">Respondemos por e-mail. Se for um pedido sobre seus dados — acesso, correção, exportação ou exclusão — escreva “solicitação de privacidade” no assunto para chegarmos mais rápido a quem cuida disso.</p>
    </div>
    <AdSlot page="/contato" slot="contact-inline" />
  </main>;
}
