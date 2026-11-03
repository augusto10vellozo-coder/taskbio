import { Link } from "@tanstack/react-router";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Closing call to action shared by the public content pages. */
export function ContentCta({ title = "Teste sem criar conta" }: { title?: string }) {
  return (
    <aside className="mt-12 rounded-2xl bg-brand-soft p-6 ring-1 ring-line">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-steel">
        Você monta a semana em dois minutos, marca o que cumpriu e o app cuida do resto. Grátis e sem
        cadastro para experimentar.
      </p>
      <Button asChild className="mt-4">
        <Link to="/convite">
          <CalendarPlus /> Começar agora
        </Link>
      </Button>
    </aside>
  );
}
