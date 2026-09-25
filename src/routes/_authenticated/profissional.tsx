import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Activity, MailPlus, UserRoundCheck, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profissional")({
  head: () => ({ meta: [
    { title: "Área profissional — Trilha" },
    { name: "description", content: "Convide alunos e acompanhe rotinas autorizadas no Trilha." },
    { property: "og:title", content: "Área profissional — Trilha" },
    { property: "og:description", content: "Gestão segura de alunos e vínculos profissionais." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ProfessionalPage,
});

type LinkRow = { id: string; client_id: string | null; invite_email: string; status: "pending" | "active" | "declined" | "ended" };
type ClientSummary = { plan?: Record<string, Array<{ done?: boolean }>>; settings?: { workoutHistory?: unknown[] } };

function ProfessionalPage() {
  const { user } = Route.useRouteContext();
  const [isProfessional, setIsProfessional] = useState<boolean | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [email, setEmail] = useState("");
  const [summaries, setSummaries] = useState<Record<string, ClientSummary>>({});

  async function load() {
    const [{ data: role }, { data: rows }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "professional").maybeSingle(),
      supabase.from("professional_clients").select("id, client_id, invite_email, status").eq("professional_id", user.id).order("created_at", { ascending: false }),
    ]);
    const allowed = role?.role === "professional";
    setIsProfessional(allowed);
    const currentLinks = (rows as LinkRow[] | null) ?? [];
    setLinks(currentLinks);
    const activeIds = currentLinks.filter((item) => item.status === "active" && item.client_id).map((item) => item.client_id as string);
    if (allowed && activeIds.length) {
      const { data } = await supabase.from("user_data").select("user_id, plan, settings").in("user_id", activeIds);
      const next: Record<string, ClientSummary> = {};
      (data ?? []).forEach((item) => {
        next[item.user_id] = {
          plan: item.plan as ClientSummary["plan"],
          settings: item.settings as ClientSummary["settings"],
        };
      });
      setSummaries(next);
    }
  }

  useEffect(() => { void load(); }, [user.id]);

  async function invite(event: FormEvent) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    const { error } = await supabase.from("professional_clients").insert({ professional_id: user.id, invite_email: normalized });
    if (error) { toast.error("Não foi possível enviar o convite. Verifique se já existe um vínculo."); return; }
    setEmail(""); toast.success("Convite registrado. O aluno poderá aceitar ao entrar."); void load();
  }

  async function endLink(id: string) {
    const { error } = await supabase.from("professional_clients").update({ status: "ended" }).eq("id", id);
    if (error) { toast.error("Não foi possível encerrar o vínculo."); return; }
    toast.success("Acompanhamento encerrado."); void load();
  }

  if (isProfessional === null) return <main className="mx-auto max-w-5xl px-5 py-14 sm:px-8"><div className="h-52 animate-pulse rounded-lg bg-mist" /></main>;
  if (!isProfessional) return <main className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8"><UsersRound className="mx-auto size-10 text-brand-deep" /><h1 className="mt-4 font-display text-3xl font-semibold">Área reservada a profissionais validados</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-steel">A abertura de perfis profissionais será gradual, após validação comercial e documental. Sua conta pessoal continua com os recursos disponíveis.</p><Button asChild className="mt-6" variant="outline"><Link to="/perfil">Voltar ao perfil</Link></Button></main>;

  return <main className="mx-auto max-w-5xl px-5 pb-20 pt-9 sm:px-8"><section><p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Plano Profissional</p><h1 className="mt-2 font-display text-4xl font-semibold">Seus alunos, com autorização</h1><p className="mt-2 max-w-2xl text-sm text-steel">O aluno decide se aceita o acompanhamento. Você só visualiza a rotina enquanto o vínculo estiver ativo.</p></section>
    <form onSubmit={invite} className="mt-7 flex flex-col gap-2 rounded-lg bg-card p-5 ring-1 ring-line sm:flex-row sm:items-end"><label className="flex-1 text-sm font-medium">E-mail do aluno<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-md bg-background px-3 font-normal ring-1 ring-line" placeholder="aluno@exemplo.com" /></label><Button><MailPlus /> Convidar</Button></form>
    <section className="mt-6"><h2 className="font-display text-xl font-semibold">Vínculos</h2>{links.length === 0 ? <div className="mt-3 border-y border-dashed border-line py-10 text-center"><UsersRound className="mx-auto size-7 text-steel" /><p className="mt-2 text-sm font-medium">Nenhum aluno vinculado</p><p className="mt-1 text-xs text-steel">Use o e-mail da conta do aluno para convidá-lo.</p></div> : <div className="mt-3 grid gap-3">{links.map((link) => { const summary = link.client_id ? summaries[link.client_id] : undefined; const blocks = Object.values(summary?.plan ?? {}).flat(); const done = blocks.filter((block) => block.done).length; const workouts = summary?.settings?.workoutHistory?.length ?? 0; return <article key={link.id} className="rounded-lg bg-card p-5 ring-1 ring-line"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="font-medium">{link.invite_email}</p><p className="mt-1 text-xs text-steel">{link.status === "active" ? "Acompanhamento ativo" : link.status === "pending" ? "Aguardando aceite" : link.status === "declined" ? "Convite recusado" : "Vínculo encerrado"}</p></div>{link.status !== "ended" && <Button size="sm" variant="outline" onClick={() => endLink(link.id)}>Encerrar vínculo</Button>}</div>{link.status === "active" && <div className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-2"><p className="flex items-center gap-2 text-sm"><UserRoundCheck className="size-4 text-good" /> {done} de {blocks.length} blocos concluídos</p><p className="flex items-center gap-2 text-sm"><Activity className="size-4 text-brand-deep" /> {workouts} treinos no histórico</p></div>}</article>; })}</div>}</section>
  </main>;
}