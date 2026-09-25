import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Bell, Download, LogOut, Save, Trash2, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { GOALS } from "@/lib/trilha-data";
import { useTrilha } from "@/lib/trilha-store";
import { deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [
    { title: "Meu perfil — Trilha" },
    { name: "description", content: "Gerencie seu perfil, objetivo e preferências no Trilha." },
    { property: "og:title", content: "Meu perfil — Trilha" },
    { property: "og:description", content: "Preferências pessoais da sua rotina saudável." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ProfilePage,
});

type Preferences = { reminders: boolean; weeklySummary: boolean; compactView: boolean };

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const { setGoal } = useTrilha();
  const trilha = useTrilha();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [goal, setProfileGoal] = useState("");
  const [preferences, setPreferences] = useState<Preferences>({ reminders: true, weeklySummary: true, compactView: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("display_name, avatar_url, goal, preferences").eq("id", user.id).single().then(({ data, error }) => {
      if (error) toast.error("Não foi possível carregar seu perfil.");
      if (data) {
        setName(data.display_name || user.user_metadata["display_name"] || "");
        setAvatarUrl(data.avatar_url || user.user_metadata["avatar_url"] || "");
        setProfileGoal(data.goal || "");
        if (data.preferences && typeof data.preferences === "object" && !Array.isArray(data.preferences)) {
          const saved = data.preferences as Record<string, unknown>;
          setPreferences((current) => ({
            reminders: typeof saved["reminders"] === "boolean" ? saved["reminders"] : current.reminders,
            weeklySummary: typeof saved["weeklySummary"] === "boolean" ? saved["weeklySummary"] : current.weeklySummary,
            compactView: typeof saved["compactView"] === "boolean" ? saved["compactView"] : current.compactView,
          }));
        }
      }
      setLoading(false);
    });
  }, [user.id, user.user_metadata]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim(), avatar_url: avatarUrl.trim() || null, goal: goal || null, preferences, updated_at: new Date().toISOString() }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar o perfil.");
      return;
    }
    if (goal) setGoal(goal);
    toast.success("Perfil atualizado.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function enableNotifications() {
    if (!("Notification" in window)) { toast.error("Este navegador não oferece notificações."); return; }
    const permission = await Notification.requestPermission();
    permission === "granted" ? toast.success("Lembretes ativados neste aparelho.") : toast.error("Permissão de lembretes não concedida.");
  }

  async function exportData() {
    const [{ data: profile }, { data: progress }] = await Promise.all([
      supabase.from("profiles").select("display_name, goal, preferences, created_at, updated_at").eq("id", user.id).single(),
      supabase.from("progress_entries").select("entry_date, kind, value, unit, label, notes, created_at").eq("user_id", user.id),
    ]);
    const payload = { exportedAt: new Date().toISOString(), profile, agenda: trilha.plan, workouts: trilha.workouts, meals: trilha.meals, shoppingItems: trilha.shoppingItems, progress };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `trilha-dados-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
    toast.success("Arquivo de dados criado.");
  }

  async function removeAccount() {
    if (!window.confirm("Excluir definitivamente sua conta e todos os dados? Esta ação não pode ser desfeita.")) return;
    try { await deleteMyAccount(); await supabase.auth.signOut(); navigate({ to: "/", replace: true }); toast.success("Conta excluída."); }
    catch { toast.error("Não foi possível excluir a conta agora."); }
  }

  return <main className="mx-auto max-w-4xl px-5 pb-20 pt-8 sm:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Sua conta</p><h1 className="mt-2 font-display text-3xl font-semibold">Meu perfil</h1></div><Button variant="outline" onClick={signOut}><LogOut /> Sair</Button></div>
    <form onSubmit={save} className="mt-7 grid gap-5 lg:grid-cols-[220px_1fr]">
      <aside className="glass-strong rounded-2xl p-5 text-center ring-1 ring-black/5">{avatarUrl ? <img src={avatarUrl} alt="Foto do perfil" className="mx-auto size-24 rounded-full object-cover ring-4 ring-card" /> : <div className="mx-auto grid size-24 place-items-center rounded-full bg-mist text-steel"><UserRound className="size-10" /></div>}<p className="mt-4 text-sm font-medium">{name || "Seu nome"}</p><p className="mt-1 truncate text-xs text-steel">{user.email}</p></aside>
      <section className="glass-strong rounded-2xl p-6 ring-1 ring-black/5">{loading ? <p className="text-sm text-steel">Carregando perfil...</p> : <div className="space-y-5"><label className="block text-sm font-medium">Nome<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-10 w-full rounded-md bg-card px-3 font-normal ring-1 ring-line" /></label><label className="block text-sm font-medium">Endereço da foto<input type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} className="mt-1.5 h-10 w-full rounded-md bg-card px-3 font-normal ring-1 ring-line" placeholder="https://..." /></label><label className="block text-sm font-medium">Objetivo principal<select value={goal} onChange={(event) => setProfileGoal(event.target.value)} className="mt-1.5 h-10 w-full rounded-md bg-card px-3 font-normal ring-1 ring-line"><option value="">Escolha um objetivo</option>{GOALS.map((item) => <option key={item}>{item}</option>)}</select></label><fieldset><legend className="text-sm font-medium">Preferências</legend><div className="mt-2 space-y-2">{([{ key: "reminders", label: "Receber lembretes da rotina" }, { key: "weeklySummary", label: "Receber resumo semanal" }, { key: "compactView", label: "Usar visualização compacta" }] as const).map((item) => <label key={item.key} className="flex items-center gap-3 rounded-lg bg-card p-3 text-sm ring-1 ring-line"><input type="checkbox" checked={preferences[item.key]} onChange={(event) => setPreferences((current) => ({ ...current, [item.key]: event.target.checked }))} className="size-4 accent-brand" />{item.label}</label>)}</div></fieldset><Button disabled={saving}><Save />{saving ? "Salvando..." : "Salvar perfil"}</Button></div>}</section>
    </form>
    <section className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-lg bg-card p-5 ring-1 ring-line"><h2 className="font-display text-xl font-semibold">Privacidade e dados</h2><p className="mt-2 text-sm text-steel">Baixe uma cópia dos seus registros ou exclua sua conta e seus dados.</p><div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={exportData}><Download /> Exportar dados</Button><Button type="button" variant="destructive" onClick={removeAccount}><Trash2 /> Excluir conta</Button></div></div><div className="rounded-lg bg-card p-5 ring-1 ring-line"><h2 className="font-display text-xl font-semibold">Lembretes no aparelho</h2><p className="mt-2 text-sm text-steel">Funcionam enquanto o Trilha estiver aberto neste navegador.</p><Button type="button" className="mt-4" variant="outline" onClick={enableNotifications}><Bell /> Permitir lembretes</Button></div></section>
    <div className="mt-6 rounded-lg bg-card p-5 ring-1 ring-line"><h2 className="font-display text-xl font-semibold">Você trabalha com saúde ou atividade física?</h2><p className="mt-2 text-sm text-steel">A área profissional está em validação e tem acesso separado e controlado aos alunos.</p><Button asChild type="button" className="mt-4" variant="outline"><Link to="/profissional"><UsersRound /> Conhecer área profissional</Link></Button></div>
    <footer className="mt-8 flex flex-wrap gap-4 text-xs text-steel"><Link to="/privacidade" className="underline">Privacidade</Link><Link to="/termos" className="underline">Termos</Link><Link to="/reembolso" className="underline">Cancelamentos e reembolsos</Link></footer>
  </main>;
}