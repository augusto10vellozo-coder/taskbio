import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { INVITE_USER_KEY } from "@/components/InviteManager";

export const Route = createFileRoute("/convite/$username")({
  head: ({ params }) => ({ meta: [
    { title: `Convite de @${params.username} — TaskBio` },
    { name: "description", content: "Você foi convidado para ser amigo no TaskBio e competir na liga semanal de hábitos." },
    { property: "og:title", content: `@${params.username} te chamou pro TaskBio` },
    { property: "og:description", content: "Organize sua semana e compita nos hábitos com seus amigos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ConviteUsuario,
});

function ConviteUsuario() {
  const { username } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const valid = /^[a-z0-9_.]{3,20}$/.test(username.toLowerCase());
  useEffect(() => {
    if (!valid) return;
    if (user) navigate({ to: "/amigos", search: { add: username.toLowerCase() } as never });
    else if (!loading) localStorage.setItem(INVITE_USER_KEY, username.toLowerCase());
  }, [user?.id, loading, valid]);
  return (
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-lg place-items-center px-5 py-12">
      <section className="glass-strong w-full rounded-2xl p-7 text-center ring-1 ring-line">
        <UserPlus className="mx-auto size-10 text-brand" />
        <h1 className="mt-3 font-display text-3xl font-semibold">@{username} te chamou pro TaskBio</h1>
        <p className="mt-3 text-sm leading-6 text-steel">Crie sua conta e vocês viram amigos na liga semanal de hábitos.</p>
        <Button asChild className="mt-6 w-full"><Link to="/auth">Criar conta e adicionar @{username}</Link></Button>
      </section>
    </main>
  );
}
