import { createFileRoute, Link } from "@tanstack/react-router";
import { MODULES, isModuleOn } from "@/lib/modules";
import { useTaskBio } from "@/lib/trilha-store";

export const Route = createFileRoute("/modulos")({
  head: () => ({ meta: [
    { title: "Módulos — TaskBio" },
    { name: "description", content: "Escolha quais áreas do TaskBio aparecem para você: hábitos, finanças, saúde, leitura e estudos." },
    { property: "og:title", content: "Módulos — TaskBio" },
    { property: "og:description", content: "Ative ou desative áreas a qualquer momento sem perder dados." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Modulos,
});

function Modulos() {
  const { modules, setModule } = useTaskBio();
  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <section className="pt-8 pb-5"><p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Módulos</p><h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Monte o seu TaskBio</h1><p className="mt-2 text-sm text-steel">Desativar um módulo apenas o tira do menu. Seus registros continuam guardados e voltam ao reativar.</p></section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.filter((m) => m.optional).map((m) => { const on = isModuleOn(modules, m.id); const Icon = m.icon; return (
          <section key={m.id} className={`rounded-lg bg-card p-4 ring-1 ${on ? "ring-brand" : "ring-line"}`}>
            <div className="flex items-start justify-between gap-3"><Icon className="size-5 text-brand" /><button type="button" role="switch" aria-checked={on} aria-label={`${on ? "Desativar" : "Ativar"} ${m.label}`} onClick={() => setModule(m.id, !on)} className={`relative h-6 w-11 rounded-full transition ${on ? "bg-brand" : "bg-mist ring-1 ring-line"}`}><span className={`absolute top-0.5 size-5 rounded-full bg-card shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} /></button></div>
            <h2 className="mt-3 font-display text-lg font-semibold">{m.label}</h2><p className="text-sm text-steel">{m.description}</p>
            {on && <Link to={m.to} className="mt-2 inline-block text-xs font-medium text-brand-deep">Abrir →</Link>}
          </section>
        ); })}
      </div>
    </main>
  );
}
