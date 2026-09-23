import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Criar nova senha — Trilha" },
    { name: "description", content: "Defina uma nova senha para sua conta Trilha." },
    { property: "og:title", content: "Criar nova senha — Trilha" },
    { property: "og:description", content: "Recupere com segurança sua conta Trilha." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setRecovery(hash.get("type") === "recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmed) return toast.error("As senhas não coincidem.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    setSaved(true);
  }

  return <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-md place-items-center px-5 py-12"><section className="glass-strong w-full rounded-2xl p-7 ring-1 ring-black/5"><h1 className="font-display text-3xl font-semibold">Nova senha</h1>{saved ? <><p className="mt-3 text-sm text-steel">Senha atualizada. Sua conta está pronta para uso.</p><Button asChild className="mt-6 w-full"><Link to="/">Ir para minha semana</Link></Button></> : recovery ? <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">Nova senha<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-10 w-full rounded-md bg-card px-3 font-normal ring-1 ring-line" /></label><label className="block text-sm font-medium">Confirmar nova senha<input required minLength={8} type="password" value={confirmed} onChange={(event) => setConfirmed(event.target.value)} className="mt-1.5 h-10 w-full rounded-md bg-card px-3 font-normal ring-1 ring-line" /></label><Button className="w-full">Salvar nova senha</Button></form> : <><p className="mt-3 text-sm text-steel">Abra esta página pelo link enviado ao seu e-mail.</p><Button asChild variant="outline" className="mt-6 w-full"><Link to="/esqueci-senha">Solicitar outro link</Link></Button></>}</section></main>;
}