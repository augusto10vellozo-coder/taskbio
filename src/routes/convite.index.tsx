import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarPlus, Flame, ShieldCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { getWeekKeys } from "@/lib/calendar-utils";
import { exampleWeek } from "@/lib/example-week";
import { trackProductEvent } from "@/lib/product-telemetry";

export const Route = createFileRoute("/convite/")({
  head: () => ({
    meta: [
      { title: "TaskBio — sua rotina de estudos, dia após dia" },
      { name: "description", content: "Monte sua semana em 2 minutos, marque o que cumpriu e mantenha a sequência. Grátis e sem cadastro para testar." },
      { property: "og:title", content: "Sua rotina de estudos, dia após dia" },
      { property: "og:description", content: "Monte sua semana em 2 minutos, marque o que cumpriu e mantenha a sequência. Grátis e sem cadastro para testar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Convite,
});

/** Landing page for cold traffic: one promise, one action, no signup required. */
function Convite() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ready, replaceDays } = useTaskBio();

  const start = () => {
    replaceDays(exampleWeek(getWeekKeys(new Date())));
    trackProductEvent("week_example_used", user?.id);
    toast.success("Semana de exemplo adicionada. Ajuste como quiser.");
    void navigate({ to: "/" });
  };

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:px-8">
      <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-deep">
        <Sparkles className="size-3.5" /> Rotina de estudos, sem planilha
      </p>
      <h1 className="mt-5 font-display text-3xl font-semibold leading-tight sm:text-4xl">
        Seu cronograma existe. Sua rotina, nem sempre.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-steel">
        O TaskBio transforma a semana em blocos simples de cumprir: estudo, treino, refeição e descanso.
        Você marca o que fez, vê a sequência crescer e não precisa de planilha.
      </p>

      <ul className="mt-7 space-y-3">
        {[
          { icon: CalendarPlus, title: "Monte a semana em 2 minutos", text: "Comece com uma semana pronta e ajuste o que quiser." },
          { icon: Flame, title: "Marque o que cumpriu", text: "A sequência de dias mostra seu progresso real, não a intenção." },
          { icon: ShieldCheck, title: "Grátis e sem cadastro para testar", text: "Seus dados ficam neste aparelho até você decidir criar conta." },
        ].map((item) => (
          <li key={item.title} className="flex gap-3 rounded-xl bg-card p-4 ring-1 ring-line">
            <item.icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
            <span>
              <span className="block text-sm font-semibold">{item.title}</span>
              <span className="mt-0.5 block text-sm text-steel">{item.text}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={!ready} onClick={start}>
          <CalendarPlus /> Começar com uma semana de exemplo
        </Button>
        <Link to="/auth" className="text-sm font-medium text-brand-deep underline underline-offset-4">
          Já tenho conta
        </Link>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-steel">
        <X className="size-3.5" aria-hidden="true" /> Não pedimos cartão, telefone nem dados de saúde.
      </p>

      <p className="mt-10 border-t border-line pt-5 text-xs text-steel">
        <Link to="/sobre" className="underline">Sobre</Link> ·{" "}
        <Link to="/privacidade" className="underline">Privacidade</Link> ·{" "}
        <Link to="/termos" className="underline">Termos</Link>
      </p>
    </main>
  );
}
