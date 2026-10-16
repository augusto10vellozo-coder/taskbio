import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { INVITE_KEY } from "@/components/InviteManager";

export const Route = createFileRoute("/convite")({
  validateSearch: (s: Record<string, unknown>) => ({ ref: typeof s["ref"] === "string" ? s["ref"] : "" }),
  head: () => ({ meta: [
    { title: "Convite para a liga — TaskBio" },
    { name: "description", content: "Você foi convidado para organizar a semana no TaskBio e competir nos hábitos com amigos." },
    { property: "og:title", content: "Entre na minha liga no TaskBio" },
    { property: "og:description", content: "Organize sua semana e compita nos hábitos com seus amigos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Convite,
});

function Convite() {
  const { ref } = Route.useSearch();
  const { user } = useAuth();
  useEffect(() => { if (/^[a-f0-9]{6,20}$/.test(ref)) localStorage.setItem(INVITE_KEY, ref); }, [ref]);
  return (
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-lg place-items-center px-5 py-12">
      <section className="glass-strong w-full rounded-2xl p-7 text-center ring-1 ring-black/5">
        <Trophy className="mx-auto size-10 text-brand" />
        <h1 className="mt-3 font-display text-3xl font-semibold">Você foi convidado para uma liga</h1>
        <p className="mt-3 text-sm leading-6 text-steel">No TaskBio você organiza agenda, treinos e refeições — e compete com amigos marcando seus hábitos. A liga premia a constância.</p>
        {user ? <Button asChild className="mt-6 w-full"><Link to="/amigos">Ver minha liga</Link></Button> : <Button asChild className="mt-6 w-full"><Link to="/auth">Criar conta e entrar na liga</Link></Button>}
      </section>
    </main>
  );
}
