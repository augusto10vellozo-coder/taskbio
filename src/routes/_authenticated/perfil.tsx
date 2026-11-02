import { ModuleHeader } from "@/components/ModuleHeader";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bell, Download, LogOut, MonitorSmartphone, Moon, Save, Sun, Trash2, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { GOALS } from "@/lib/trilha-data";
import { useTaskBio, ACCOUNT_WIPE_KEY } from "@/lib/trilha-store";
import { deleteMyAccount } from "@/lib/account.functions";
import { disableServerPush, enableServerPush, type PushResult } from "@/lib/push-client";
import { useThemePreference, type ThemePreference } from "@/lib/theme-context";
import { saveProfileTheme } from "@/lib/theme-preference";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [
    { title: "Meu perfil — TaskBio" },
    { name: "description", content: "Gerencie seu perfil, objetivo e preferências no TaskBio." },
    { property: "og:title", content: "Meu perfil — TaskBio" },
    { property: "og:description", content: "Preferências pessoais da sua rotina saudável." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const { setGoal } = useTaskBio();
  const trilha = useTaskBio();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [goal, setProfileGoal] = useState("");
  const savedPrefsRef = useRef<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteWord, setDeleteWord] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("display_name, avatar_url, goal, preferences").eq("id", user.id).single().then(({ data, error }) => {
      if (error) toast.error("Não foi possível carregar seu perfil.");
      if (data) {
        setName(data.display_name || user.user_metadata["display_name"] || "");
        setAvatarUrl(data.avatar_url || user.user_metadata["avatar_url"] || "");
        setProfileGoal(data.goal || "");
        if (data.preferences && typeof data.preferences === "object" && !Array.isArray(data.preferences)) {
          savedPrefsRef.current = data.preferences as Record<string, unknown>;
        }
      }
      setLoading(false);
    });
  }, [user.id, user.user_metadata]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim(), avatar_url: avatarUrl.trim() || null, goal: goal || null, preferences: savedPrefsRef.current as Json, updated_at: new Date().toISOString() }).eq("id", user.id);
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
    const result = await enableServerPush();
    const messages: Record<PushResult, string> = {
      ok: "Avisos ativados neste aparelho, mesmo com o TaskBio fechado.",
      unsupported: "Este navegador não oferece notificações.",
      "ios-install": "No iPhone, adicione o TaskBio à Tela de Início pelo Safari e ative os avisos pelo app instalado.",
      frame: "Abra o TaskBio em uma aba própria para ativar os avisos.",
      denied: "Permissão negada. Libere as notificações do TaskBio nos ajustes do aparelho.",
      "signed-out": "Entre na sua conta para ativar os avisos.",
      error: "Não foi possível ativar os avisos. Tente novamente.",
    };
    result === "ok" ? toast.success(messages[result]) : toast.error(messages[result]);
  }

  async function disableNotifications() {
    await disableServerPush();
    toast.success("Avisos desativados neste aparelho.");
  }

  async function exportData() {
    const [{ data: profile }, { data: progress }, { data: stored }, { data: points }, { data: devices }] = await Promise.all([
      supabase.from("profiles").select("display_name, goal, preferences, created_at, updated_at").eq("id", user.id).maybeSingle(),
      supabase.from("progress_entries").select("entry_date, kind, value, unit, label, notes, created_at").eq("user_id", user.id),
      supabase.from("user_data").select("plan, workouts, meals, shopping_state, settings").eq("user_id", user.id).maybeSingle(),
      supabase.from("xp_events").select("kind, ref, day, points, created_at").eq("user_id", user.id).order("created_at"),
      supabase.from("push_subscriptions").select("device_label, timezone, active, created_at").eq("user_id", user.id),
    ]);
    const payload = {
      exportedAt: new Date().toISOString(),
      conta: { id: user.id, email: user.email },
      perfil: profile,
      rotina: stored
        ? { agenda: stored.plan, treinos: stored.workouts, refeicoes: stored.meals, compras: stored.shopping_state }
        : { agenda: trilha.plan, treinos: trilha.workouts, refeicoes: trilha.meals, compras: trilha.shoppingItems },
      // Hábitos, registro de hábitos, saúde, finanças, leitura, estudos e histórico de exercícios.
      registros: stored?.settings ?? {},
      progresso: progress ?? [],
      pontos: points ?? [],
      aparelhos: devices ?? [],
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `taskbio-dados-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
    toast.success("Arquivo de dados criado.");
  }

  async function removeAccount() {
    setDeleting(true);
    try {
      // Marca antes de excluir: garante que a próxima visita neste navegador comece vazia,
      // mesmo que algo reescreva o estado local durante a navegação.
      try { localStorage.setItem(ACCOUNT_WIPE_KEY, "1"); } catch { /* armazenamento indisponível */ }
      // Apaga as fotos pelo Storage (a política permite ao dono) antes de remover a conta.
      try {
        const { data: files } = await supabase.storage.from("xp-photos").list(user.id, { limit: 1000 });
        if (files?.length) await supabase.storage.from("xp-photos").remove(files.map((file) => `${user.id}/${file.name}`));
      } catch { /* a limpeza das fotos não impede a exclusão da conta */ }
      try {
        await deleteMyAccount();
      } catch (cause) {
        // A conta continua existindo: não podemos apagar os dados locais.
        try { localStorage.removeItem(ACCOUNT_WIPE_KEY); } catch { /* armazenamento indisponível */ }
        throw cause;
      }
      try { await supabase.auth.signOut(); } catch { /* a sessão já deixa de valer com a conta */ }
      window.location.replace("/");
    } catch {
      toast.error("Não foi possível excluir a conta agora.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
      setDeleteWord("");
    }
  }

  return <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8"><ModuleHeader title="Meu perfil" /><div className="flex justify-end"><Button variant="outline" onClick={signOut}><LogOut /> Sair</Button></div>
    <form onSubmit={save} className="mt-7 grid gap-5 lg:grid-cols-[220px_1fr]">
      <aside className="glass-strong rounded-2xl p-5 text-center ring-1 ring-line">{avatarUrl ? <img src={avatarUrl} alt="Foto do perfil" className="mx-auto size-24 rounded-full object-cover ring-4 ring-card" /> : <div className="mx-auto grid size-24 place-items-center rounded-full bg-mist text-steel"><UserRound className="size-10" /></div>}<p className="mt-4 text-sm font-medium">{name || "Seu nome"}</p><p className="mt-1 truncate text-xs text-steel">{user.email}</p></aside>
      <section className="glass-strong rounded-2xl p-6 ring-1 ring-line">{loading ? <p className="text-sm text-steel">Carregando perfil...</p> : <div className="space-y-5"><label className="block text-sm font-medium">Nome<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-10 w-full rounded-md bg-card px-3 font-normal ring-1 ring-line" /></label><label className="block text-sm font-medium">Endereço da foto<input type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} className="mt-1.5 h-10 w-full rounded-md bg-card px-3 font-normal ring-1 ring-line" placeholder="https://..." /></label><label className="block text-sm font-medium">Objetivo principal<select value={goal} onChange={(event) => setProfileGoal(event.target.value)} className="mt-1.5 h-10 w-full rounded-md bg-card px-3 font-normal ring-1 ring-line"><option value="">Escolha um objetivo</option>{GOALS.map((item) => <option key={item}>{item}</option>)}</select></label><Button disabled={saving}><Save />{saving ? "Salvando..." : "Salvar perfil"}</Button></div>}</section>
    </form>
    <section className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-lg bg-card p-5 ring-1 ring-line"><h2 className="font-display text-xl font-semibold">Privacidade e dados</h2><p className="mt-2 text-sm text-steel">Baixe uma cópia dos seus registros ou exclua sua conta e seus dados.</p><div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={exportData}><Download /> Exportar dados</Button><Button type="button" variant="destructive" onClick={() => { setDeleteWord(""); setConfirmDelete(true); }}><Trash2 /> Excluir conta</Button></div></div><div className="rounded-lg bg-card p-5 ring-1 ring-line"><h2 className="font-display text-xl font-semibold">Lembretes no aparelho</h2><p className="mt-2 text-sm text-steel">Avisamos cerca de 5 minutos antes dos compromissos (30 minutos antes dos treinos), mesmo com o TaskBio fechado. No iPhone, use o app instalado na Tela de Início.</p><div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={enableNotifications}><Bell /> Ativar avisos</Button><Button type="button" variant="ghost" onClick={disableNotifications}>Desativar</Button></div></div></section>
    <AppearanceSection userId={user.id} />
    <NotificationPrefsSection />
    <div className="mt-6 rounded-lg bg-card p-5 ring-1 ring-line"><h2 className="font-display text-xl font-semibold">Você trabalha com saúde ou atividade física?</h2><p className="mt-2 text-sm text-steel">A área profissional tem acesso separado e controlado aos alunos, mediante autorização.</p><Button asChild type="button" className="mt-4" variant="outline"><Link to="/profissional"><UsersRound /> Conhecer área profissional</Link></Button></div>
    <footer className="mt-8 flex flex-wrap gap-4 text-xs text-steel"><Link to="/privacidade" className="underline">Privacidade</Link><Link to="/termos" className="underline">Termos</Link></footer>
    <Dialog open={confirmDelete} onOpenChange={(open) => { if (!deleting) setConfirmDelete(open); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir conta</DialogTitle>
          <DialogDescription>
            Esta ação apaga permanentemente sua conta e todos os seus dados: rotina, treinos, refeições, hábitos, saúde, finanças, pontos e fotos. Não é possível desfazer.
          </DialogDescription>
        </DialogHeader>
        <label className="mt-2 block text-sm" htmlFor="confirmar-exclusao">Para confirmar, digite <strong>EXCLUIR</strong>.</label>
        <Input id="confirmar-exclusao" value={deleteWord} onChange={(event) => setDeleteWord(event.target.value)} className="mt-2" autoComplete="off" />
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          <Button type="button" variant="destructive" disabled={deleting || deleteWord.trim().toUpperCase() !== "EXCLUIR"} onClick={removeAccount}>
            {deleting ? "Excluindo..." : "Excluir definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </main>;
}
function AppearanceSection({ userId }: { userId: string }) {
  const { theme, setTheme } = useThemePreference();
  const options = [
    { value: "light", label: "Claro", hint: "Fundo claro e suave", icon: Sun },
    { value: "dark", label: "Escuro", hint: "Fundo escuro que descansa a vista", icon: Moon },
    { value: "system", label: "Automático", hint: "Segue o tema do aparelho", icon: MonitorSmartphone },
  ] as const;
  const choose = (value: ThemePreference) => {
    setTheme(value); // troca na hora, sem recarregar
    void saveProfileTheme(userId, value);
  };
  return <section className="mt-6 rounded-lg bg-card p-5 ring-1 ring-line"><h2 className="font-display text-xl font-semibold">Aparência</h2><p className="mt-2 text-sm text-steel">Escolha como o TaskBio aparece para você.</p><div className="mt-4 grid gap-2 sm:grid-cols-3">{options.map((option) => <button key={option.value} type="button" onClick={() => choose(option.value)} aria-pressed={theme === option.value} className={`flex items-start gap-3 rounded-lg p-3 text-left transition-shadow ${theme === option.value ? "bg-brand-soft ring-2 ring-brand" : "bg-mist/60 ring-1 ring-line"}`}><option.icon className="mt-0.5 size-4 shrink-0 text-brand" /><span><span className="block text-sm font-medium">{option.label}</span><span className="block text-xs text-steel">{option.hint}</span></span></button>)}</div></section>;
}
function NotificationPrefsSection() {
  const { notifPrefs, setNotifPref } = useTaskBio();
  const layers = [
    { key: "streak", label: "Streak em risco", hint: "Aviso às 20h e marcos de 5, 10, 20, 30 e 50 dias" },
    { key: "dayClose", label: "Fechamento do dia", hint: "Aviso às 21h30 com os pendentes e quando fechar 100%" },
    { key: "meals", label: "Registro de refeição", hint: "45 min após cada refeição planejada" },
    { key: "tasks", label: "Tarefas e compromissos", hint: "Aviso antes de cada item da agenda" },
    { key: "workouts", label: "Treinos", hint: "Aviso 30 min antes dos treinos" },
    { key: "weekly", label: "Resumo semanal", hint: "Domingo às 20h, com seus números da semana" },
    { key: "exams", label: "Provas e entregas", hint: "Avisos no dia anterior e no dia marcado" },
  ] as const;
  const toggleMaster = (on: boolean) => {
    setNotifPref("master", on);
    if (on && typeof Notification !== "undefined" && Notification.permission === "denied") {
      toast.info("As notificações estão bloqueadas no aparelho. Libere o TaskBio nos ajustes do sistema para receber os avisos.");
    }
  };
  return <section className="mt-6 rounded-lg bg-card p-5 ring-1 ring-line"><h2 className="font-display text-xl font-semibold">Notificações</h2><p className="mt-2 text-sm text-steel">Escolha quais avisos quer receber. Nada é enviado entre 22h30 e 7h.</p><label className="mt-4 flex items-start gap-3 rounded-lg bg-card p-3 ring-1 ring-brand/40"><input type="checkbox" checked={notifPrefs.master} onChange={(event) => toggleMaster(event.target.checked)} className="mt-0.5 size-4 accent-brand" /><span><span className="block text-sm font-medium">Notificações</span><span className="block text-xs text-steel">Desligar pausa todos os avisos do app, sem remover a permissão do aparelho</span></span></label><div className="mt-2 grid gap-2 sm:grid-cols-2">{layers.map((layer) => <label key={layer.key} className={`flex items-start gap-3 rounded-lg bg-mist/60 p-3 ring-1 ring-line ${notifPrefs.master ? "" : "opacity-50"}`}><input type="checkbox" disabled={!notifPrefs.master} checked={notifPrefs[layer.key]} onChange={(event) => setNotifPref(layer.key, event.target.checked)} className="mt-0.5 size-4 accent-brand" /><span><span className="block text-sm font-medium">{layer.label}</span><span className="block text-xs text-steel">{layer.hint}</span></span></label>)}</div></section>;
}
