import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, Flame, Search, Trophy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLeague } from "@/lib/use-league";
import { sendFriendRequest } from "@/lib/social.functions";
import { WeeklyCard } from "@/components/WeeklyCard";
import { useTaskBio } from "@/lib/trilha-store";
import { brasiliaDay, leagueWeekStart, shiftDay, weekChampion, weekTitles } from "@/lib/xp";
import { useAwards, notify } from "@/lib/use-awards";

export const Route = createFileRoute("/_authenticated/amigos")({
  head: () => ({ meta: [
    { title: "Amigos e liga semanal — TaskBio" },
    { name: "description", content: "Convide amigos, acompanhe a liga semanal de hábitos e compartilhe o card da sua semana." },
    { property: "og:title", content: "Amigos — TaskBio" },
    { property: "og:description", content: "A liga premia a constância: marque seus dias e mantenha a sequência." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Amigos,
});

type Req = { id: string; display_name: string; username: string | null };
type Found = { id: string; display_name: string; username: string | null };

function Avatar({ name, url, champion }: { name: string; url: string | null; champion?: boolean }) {
  if (champion) return <span className="relative shrink-0 rounded-full p-0.5 ring-2 ring-gold" title="Campeão da semana passada"><Avatar name={name} url={url} /><Trophy className="absolute -right-1.5 -top-1.5 size-4 rounded-full bg-card p-0.5 text-gold" aria-label="Troféu de campeão" /></span>;
  return url ? <img src={url} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className="size-10 rounded-full bg-mist object-cover" /> : <span className="grid size-10 place-items-center rounded-full bg-mist text-sm font-semibold text-steel">{(name || "?").slice(0, 1).toUpperCase()}</span>;
}

function Amigos() {
  const { user } = useAuth();
  const { habitLog } = useTaskBio();
  const { rows, position, reload } = useLeague();
  const last = useLeague(-1);
  const awards = useAwards();
  const champ = last.rows ? weekChampion(last.rows) : null;
  const titles = rows ? weekTitles(rows) : new Map();
  const myTitles = (user && titles.get(user.id)) as string[] | undefined;
  useEffect(() => {
    if (!myTitles?.length) return;
    const k = `taskbio:titles:${leagueWeekStart(brasiliaDay(new Date()))}`;
    const seen = new Set((localStorage.getItem(k) ?? "").split("|").filter(Boolean));
    const fresh = myTitles.filter((t) => t !== "Campeão" && !seen.has(t));
    if (!fresh.length) return;
    fresh.forEach((t) => seen.add(t)); localStorage.setItem(k, [...seen].join("|"));
    notify("Novo título na liga", `Você conquistou: ${fresh.join(", ")}.`);
  }, [myTitles?.join("|")]);
  const [profile, setProfile] = useState<{ username: string | null; invite_code: string | null } | null>(null);
  const [uname, setUname] = useState("");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);

  const loadRequests = () => supabase.rpc("my_friend_requests").then(({ data }) => setRequests((data ?? []) as Req[]));
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username, invite_code").eq("id", user.id).maybeSingle().then(({ data }) => { setProfile(data); setUname(data?.username ?? ""); });
    void loadRequests();
  }, [user?.id]);

  async function saveUsername() {
    const v = uname.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,20}$/.test(v)) { toast.error("Use de 3 a 20 letras minúsculas, números, ponto ou _"); return; }
    const { error } = await supabase.from("profiles").update({ username: v }).eq("id", user!.id);
    if (error) { toast.error("Esse nome de usuário já está em uso."); return; }
    setProfile((p) => ({ invite_code: p?.invite_code ?? null, username: v })); toast.success("Nome de usuário salvo");
  }

  async function invite() {
    if (!profile?.invite_code) return;
    const link = `https://taskbio.com.br/convite?ref=${profile.invite_code}`;
    const text = `Tô organizando minha semana no TaskBio — entra na minha liga e a gente compete nos hábitos: ${link}`;
    if (navigator.share) await navigator.share({ text }).catch(() => undefined);
    else { await navigator.clipboard.writeText(text); toast.success("Convite copiado"); }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 3) { toast.error("Digite pelo menos 3 letras"); return; }
    const { data } = await supabase.rpc("search_profiles", { _q: q.trim() });
    setFound((data ?? []) as Found[]);
    if (!data?.length) toast("Ninguém encontrado com esse nome de usuário");
  }

  async function respond(id: string, status: "accepted" | "declined") {
    await supabase.from("friendships").update({ status, responded_at: new Date().toISOString() }).eq("id", id);
    toast.success(status === "accepted" ? "Amizade aceita" : "Convite recusado");
    void loadRequests(); void reload();
  }

  const today = brasiliaDay(new Date());
  const lastStart = shiftDay(leagueWeekStart(today), -7);
  const lastDays = Array.from({ length: 7 }, (_, i) => (habitLog[shiftDay(lastStart, i)] ?? []).length > 0);
  const label = `${shiftDay(lastStart, 0).split("-").reverse().slice(0, 2).join("/")} a ${shiftDay(lastStart, 6).split("-").reverse().slice(0, 2).join("/")}`;
  const isMonday = new Date(`${today}T12:00:00Z`).getUTCDay() === 1;

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <section className="pt-8 pb-5"><p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">Amigos</p><h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Liga semanal</h1><p className="mt-2 text-sm text-steel">A liga premia a constância: marque seus dias e mantenha a sequência</p></section>

      {isMonday && <div className="mb-4"><WeeklyCard champion={!!user && champ === user.id} me={last.me} position={last.position} friends={last.rows?.length ?? 0} days={lastDays} label={label} /></div>}

      <section className="rounded-lg bg-card p-4 ring-1 ring-line">
        {!rows ? <div className="h-24 animate-pulse rounded bg-mist" /> : <ol className="divide-y divide-line">{rows.map((r, i) => (
          <li key={r.user_id} className={`flex items-center gap-3 py-3 ${r.user_id === user?.id ? "font-medium" : ""}`}>
            <span className="w-6 text-center font-display text-lg font-semibold">{i === 0 && r.week_xp > 0 ? <Crown className="mx-auto size-5 text-brand" aria-label="1º lugar" /> : `${i + 1}º`}</span>
            <Avatar name={r.display_name || r.username || ""} url={r.avatar_url} champion={r.user_id === champ} />
            <div className="min-w-0 flex-1"><p className="truncate">{r.display_name || r.username || "Sem nome"}{r.user_id === user?.id ? " (você)" : ""}</p>{(titles.get(r.user_id) as string[] | undefined)?.length ? <span className="mt-0.5 flex flex-wrap gap-1">{(titles.get(r.user_id) as string[]).map((t) => <span key={t} className={`rounded-full px-1.5 py-px text-[10px] font-semibold ring-1 ${t === "Campeão" ? "text-gold ring-gold/60" : t === "Recomeço" ? "text-accent ring-accent/50" : "text-good ring-good/50"}`}>{t}</span>)}</span> : null}<p className="text-xs text-steel">{r.habits} hábitos · {r.meals} refeições · {r.workouts} treinos na semana · hoje {r.today_xp} XP</p></div>
            <div className="text-right"><p className="font-display text-lg font-semibold">{r.week_xp} XP</p><p className="flex items-center justify-end gap-1 text-xs text-steel"><Flame className="size-3.5 text-brand" />{r.streak}</p></div>
          </li>
        ))}</ol>}
        {rows && rows.length < 2 && <p className="mt-2 text-sm text-steel">Convide amigos para começar a competir.</p>}
        {rows && position > 0 && rows.length > 1 && <p className="mt-3 text-sm">Você está em <strong>{position}º</strong> entre seus amigos.</p>}
        <p className="mt-3 text-xs text-steel">❄️ {awards?.freezes ?? 0} congelamento(s) de sequência · o campeão da semana ganha troféu dourado e 1 congelamento.</p>
        <p className="mt-1 text-[11px] text-steel">Até 100 XP por dia contam para a liga. Peso, medidas e dados de saúde nunca aparecem aqui.</p>
      </section>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <section className="rounded-lg bg-card p-4 ring-1 ring-line">
          <h2 className="font-display text-lg font-semibold">Convidar</h2>
          <Button className="mt-3 w-full" onClick={invite} disabled={!profile?.invite_code}><UserPlus /> Convidar amigo</Button>
          <label className="mt-4 block text-xs text-steel">Seu nome de usuário
            <span className="mt-1 flex gap-2"><input value={uname} onChange={(e) => setUname(e.target.value)} placeholder="ex.: maria.silva" className="h-9 min-w-0 flex-1 rounded-md bg-background px-3 text-sm text-ink ring-1 ring-line" /><Button size="sm" variant="outline" onClick={saveUsername}>Salvar</Button></span>
          </label>
        </section>
        <section className="rounded-lg bg-card p-4 ring-1 ring-line">
          <h2 className="font-display text-lg font-semibold">Buscar por nome de usuário</h2>
          <form onSubmit={search} className="mt-3 flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="nome de usuário" aria-label="Buscar nome de usuário" className="h-9 min-w-0 flex-1 rounded-md bg-background px-3 text-sm ring-1 ring-line" /><Button size="sm"><Search /> Buscar</Button></form>
          <ul className="mt-2 divide-y divide-line">{found.map((f) => <li key={f.id} className="flex items-center gap-2 py-2 text-sm"><span className="flex-1">{f.display_name || f.username} <span className="text-xs text-steel">@{f.username}</span></span><Button size="sm" variant="outline" onClick={async () => { const r = await sendFriendRequest({ data: { to: f.id } }); toast[r.ok ? "success" : "error"](r.ok ? (r.already ? "Vocês já estão conectados ou o convite está pendente" : "Convite enviado") : "Não foi possível enviar"); }}>Convidar</Button></li>)}</ul>
        </section>
      </div>

      {requests.length > 0 && <section className="mt-4 rounded-lg bg-card p-4 ring-1 ring-brand/40">
        <h2 className="font-display text-lg font-semibold">Convites recebidos</h2>
        <ul className="mt-2 divide-y divide-line">{requests.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-sm"><span className="flex-1">{r.display_name || r.username || "Alguém"} quer entrar na sua liga</span><Button size="sm" onClick={() => respond(r.id, "accepted")}>Aceitar</Button><Button size="sm" variant="outline" onClick={() => respond(r.id, "declined")}>Recusar</Button></li>)}</ul>
      </section>}

      {!isMonday && <div className="mt-4"><WeeklyCard champion={!!user && champ === user.id} me={last.me} position={last.position} friends={last.rows?.length ?? 0} days={lastDays} label={label} /></div>}
    </main>
  );
}
