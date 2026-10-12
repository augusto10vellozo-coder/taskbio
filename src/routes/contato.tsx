import { createFileRoute } from "@tanstack/react-router";
import { AdSlot } from "@/components/AdSlot";

export const Route = createFileRoute("/contato")({
  head: () => ({ meta: [
    { title: "Contato — TaskBio" },
    { name: "description", content: "Entre em contato com o TaskBio por e-mail ou telefone para dúvidas, suporte e privacidade." },
    { property: "og:title", content: "Contato — TaskBio" },
    { property: "og:description", content: "Canais de contato para suporte e solicitações sobre seus dados no TaskBio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ContactPage,
});

function ContactPage() {
  return <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-8">
    <p className="text-xs font-medium uppercase text-brand-deep">TaskBio</p>
    <h1 className="mt-3 font-display text-4xl font-semibold">Contato</h1>
    <p className="mt-5 text-base leading-7 text-steel">Dúvidas sobre o TaskBio, suporte ou solicitações relacionadas aos seus dados? Entre em contato pelos canais abaixo.</p>
    <div className="mt-9 grid gap-7 border-y border-line py-8 sm:grid-cols-2">
      <div><h2 className="font-display text-lg font-semibold">E-mail</h2><a href="mailto:contatotaskbio@gmail.com" className="mt-2 block break-all text-brand-deep underline">contatotaskbio@gmail.com</a></div>
      <div><h2 className="font-display text-lg font-semibold">Telefone</h2><a href="tel:+5554994535730" className="mt-2 block text-brand-deep underline">(54) 99453-5730</a></div>
    </div>
    <AdSlot page="/contato" slot="contact-inline" />
  </main>;
}