import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — Trilha" },
      { name: "description", content: "Entre no Trilha para sincronizar sua rotina saudável entre dispositivos." },
      { property: "og:title", content: "Conta Trilha" },
      { property: "og:description", content: "Acesse sua rotina, treinos, refeições e progresso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/", replace: true });
  }, [authLoading, navigate, user]);

  async function handleEmail(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setConfirmationEmail(email);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível acessar sua conta.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: { prompt: "select_account" },
    });
    if (result.error) {
      toast.error(result.error.message || "Não foi possível entrar com o Google.");
      setBusy(false);
      return;
    }
    if (!result.redirected) navigate({ to: "/", replace: true });
  }

  if (confirmationEmail) {
    return (
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-lg place-items-center px-5 py-12">
        <section className="glass-strong w-full rounded-2xl p-7 ring-1 ring-black/5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-deep">Confirme sua conta</p>
          <h1 className="mt-3 font-display text-3xl font-semibold">Confira seu e-mail</h1>
          <p className="mt-3 text-sm leading-6 text-steel">
            Enviamos um link para <strong className="text-ink">{confirmationEmail}</strong>. Depois de confirmar, volte para entrar.
          </p>
          <Button className="mt-6 w-full" onClick={() => setConfirmationEmail(null)}>Voltar para entrar</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_440px] lg:px-8">
      <section className="hidden lg:block">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-deep">Sua rotina continua com você</p>
        <h1 className="mt-4 max-w-xl font-display text-5xl font-semibold leading-tight">Uma conta para manter sua semana em movimento.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-steel">Sincronize agenda, treinos, refeições e progresso com segurança em todos os seus dispositivos.</p>
      </section>

      <section className="glass-strong rounded-2xl p-6 ring-1 ring-black/5 sm:p-8">
        <div className="grid grid-cols-2 rounded-lg bg-mist p-1">
          {(["entrar", "criar"] as const).map((item) => (
            <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-md px-3 py-2 text-sm font-medium ${mode === item ? "bg-card text-ink shadow-sm" : "text-steel"}`}>
              {item === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        <h2 className="mt-6 font-display text-2xl font-semibold">{mode === "entrar" ? "Bem-vindo de volta" : "Comece sua trilha"}</h2>
        <p className="mt-1 text-sm text-steel">{mode === "entrar" ? "Acesse sua semana e continue de onde parou." : "Crie sua conta gratuita em poucos passos."}</p>

        <Button variant="outline" className="mt-6 w-full" onClick={handleGoogle} disabled={busy}>
          <span className="font-semibold">G</span> Continuar com Google
        </Button>
        <div className="my-5 flex items-center gap-3 text-xs text-steel"><span className="h-px flex-1 bg-line" />ou use seu e-mail<span className="h-px flex-1 bg-line" /></div>

        <form onSubmit={handleEmail} className="space-y-4">
          {mode === "criar" && (
            <label className="block text-sm font-medium">Nome
              <input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="mt-1.5 h-10 w-full rounded-md bg-card px-3 font-normal ring-1 ring-line focus:outline-none focus:ring-brand" placeholder="Como quer ser chamado?" />
            </label>
          )}
          <label className="block text-sm font-medium">E-mail
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-1.5 h-10 w-full rounded-md bg-card px-3 font-normal ring-1 ring-line focus:outline-none focus:ring-brand" placeholder="voce@exemplo.com" />
          </label>
          <label className="block text-sm font-medium">Senha
            <span className="relative mt-1.5 block">
              <input required minLength={8} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "entrar" ? "current-password" : "new-password"} className="h-10 w-full rounded-md bg-card px-3 pr-10 font-normal ring-1 ring-line focus:outline-none focus:ring-brand" placeholder="Mínimo de 8 caracteres" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-2 grid size-6 place-items-center text-steel" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff /> : <Eye />}</button>
            </span>
          </label>
          {mode === "entrar" && <Link to="/esqueci-senha" className="block text-right text-xs font-medium text-brand-deep">Esqueci minha senha</Link>}
          <Button className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <>{mode === "entrar" ? "Entrar" : "Criar conta"}<ArrowRight /></>}</Button>
        </form>
        <p className="mt-5 text-center text-[11px] leading-5 text-steel">Ao criar uma conta, você concorda em usar o Trilha como ferramenta de organização. As sugestões são gerais e não substituem orientação profissional.</p>
      </section>
    </main>
  );
}