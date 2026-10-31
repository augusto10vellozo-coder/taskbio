import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({ meta: [
    { title: "Recuperar senha — TaskBio" },
    { name: "description", content: "Solicite um link seguro para recuperar sua senha do TaskBio." },
    { property: "og:title", content: "Recuperar senha — TaskBio" },
    { property: "og:description", content: "Recupere o acesso à sua rotina no TaskBio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) {
      toast.error(authErrorMessage(error, "Não foi possível enviar o link. Tente de novo."));
      return;
    }
    setSent(true);
  }

  return <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-md place-items-center px-5 py-12">
    <section className="glass-strong w-full rounded-2xl p-7 ring-1 ring-line">
      <div className="grid size-11 place-items-center rounded-lg bg-brand/10 text-brand-deep"><Mail /></div>
      <h1 className="mt-5 font-display text-3xl font-semibold">Recuperar senha</h1>
      <p className="mt-2 text-sm leading-6 text-steel">{sent ? "Se houver uma conta com esse e-mail, você receberá um link para criar uma nova senha." : "Informe seu e-mail para receber um link seguro de recuperação."}</p>
      {!sent && <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">E-mail<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-md bg-card px-3 font-normal ring-1 ring-line focus:outline-none focus:ring-brand" /></label><Button className="w-full" disabled={busy}>{busy ? "Enviando..." : "Enviar link"}</Button></form>}
      <Link to="/auth" className="mt-5 block text-center text-sm font-medium text-brand-deep">Voltar para entrar</Link>
    </section>
  </main>;
}