import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { brasiliaDay, xpFor } from "@/lib/xp";

const xpInput = z.object({
  kind: z.enum(["habit", "block", "meal", "workout", "photo", "reading", "study"]),
  ref: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  on: z.boolean(),
  foodItems: z.number().int().min(0).max(100).optional(),
  photoPath: z.string().max(300).optional(),
});

/** Awards or revokes XP. The day and points are decided here, never by the browser. */
export const recordXp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => xpInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ref = `${data.kind}:${data.ref}`;
    if (!data.on) {
      await supabaseAdmin.from("xp_events").delete().eq("user_id", context.userId).eq("ref", ref);
      return { points: 0 };
    }
    const today = brasiliaDay(new Date());
    if (data.kind === "photo" && !data.photoPath?.startsWith(`${context.userId}/`)) return { points: 0 };
    const points = xpFor(data, today);
    if (points === 0) return { points: 0 };
    const { error } = await supabaseAdmin.from("xp_events").insert({ user_id: context.userId, kind: data.kind, ref, day: today, points, photo_path: data.photoPath ?? null });
    return { points: error ? 0 : points };
  });

/** Becomes friends with the owner of an invite code (used after signing up through an invite link). */
export const acceptInviteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().regex(/^[a-f0-9]{6,20}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: owner } = await supabaseAdmin.from("profiles").select("id, display_name").eq("invite_code", data.code).maybeSingle();
    if (!owner || owner.id === context.userId) return { ok: false };
    const [a, b] = [owner.id, context.userId];
    const { data: existing } = await supabaseAdmin.from("friendships").select("id").or(`and(requester.eq.${a},addressee.eq.${b}),and(requester.eq.${b},addressee.eq.${a})`).maybeSingle();
    if (existing) await supabaseAdmin.from("friendships").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", existing.id);
    else await supabaseAdmin.from("friendships").insert({ requester: a, addressee: b, status: "accepted", responded_at: new Date().toISOString() });
    const { pushToUser } = await import("@/lib/push-send.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("display_name").eq("id", context.userId).maybeSingle();
    await pushToUser(owner.id, { title: "TaskBio", body: `👋 ${me?.display_name?.trim() || "Um amigo"} entrou na sua liga`, url: "https://taskbio.com.br/amigos", tag: "invite" });
    return { ok: true, name: owner.display_name };
  });

/** Sends an in-app friend request and notifies the recipient. */
export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ to: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.to === context.userId) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [a, b] = [context.userId, data.to];
    const { data: existing } = await supabaseAdmin.from("friendships").select("id, status").or(`and(requester.eq.${a},addressee.eq.${b}),and(requester.eq.${b},addressee.eq.${a})`).maybeSingle();
    if (existing && existing.status !== "declined") return { ok: true, already: true };
    if (existing) await supabaseAdmin.from("friendships").delete().eq("id", existing.id);
    const { error } = await supabaseAdmin.from("friendships").insert({ requester: a, addressee: b });
    if (error) return { ok: false };
    const { pushToUser } = await import("@/lib/push-send.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("display_name").eq("id", a).maybeSingle();
    await pushToUser(b, { title: "TaskBio", body: `👋 ${me?.display_name?.trim() || "Um amigo"} te chamou pra liga`, url: "https://taskbio.com.br/amigos", tag: "invite" });
    return { ok: true };
  });

const APP = "https://taskbio.com.br";

/** Nudges an inactive league friend: 1 per pair per day, 5 per sender per day, never XP. */
export const sendNudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ to: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.to === context.userId) return { ok: false, reason: "self" as const };
    const { leagueWeekStart } = await import("@/lib/xp");
    const today = brasiliaDay(new Date());
    const { data: inactive } = await context.supabase.rpc("league_inactive", { _start: leagueWeekStart(today) });
    if (!(inactive ?? []).some((r: { user_id: string }) => r.user_id === data.to)) return { ok: false, reason: "active" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("nudges").select("id", { count: "exact", head: true }).eq("sender", context.userId).eq("day", today);
    if ((count ?? 0) >= 5) return { ok: false, reason: "limit" as const };
    const { error } = await supabaseAdmin.from("nudges").insert({ sender: context.userId, recipient: data.to, day: today });
    if (error) return { ok: false, reason: "already" as const };
    const { data: rows } = await supabaseAdmin.rpc("league_week_for", { _start: leagueWeekStart(today), _user_id: data.to });
    const { rankLeague } = await import("@/lib/xp");
    const ranked = rankLeague((rows ?? []) as never[]) as { user_id: string }[];
    const pos = ranked.findIndex((r) => r.user_id === data.to) + 1;
    const { data: me } = await supabaseAdmin.from("profiles").select("username, display_name").eq("id", context.userId).maybeSingle();
    const { pushToUser } = await import("@/lib/push-send.server");
    await pushToUser(data.to, { title: "TaskBio", body: `👋 ${me?.username || me?.display_name?.trim() || "Um amigo"} cutucou você! Você está em ${pos || 1}º na liga desta semana`, url: `${APP}/amigos`, tag: "nudge" });
    return { ok: true as const };
  });

/** Accepts a pending request addressed to me and notifies both people. */
export const acceptFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: f } = await supabaseAdmin.from("friendships").select("id, requester, addressee, status").eq("id", data.id).maybeSingle();
    if (!f || f.addressee !== context.userId || f.status !== "pending") return { ok: false };
    await supabaseAdmin.from("friendships").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", f.id);
    const { data: ps } = await supabaseAdmin.from("profiles").select("id, username, display_name").in("id", [f.requester, f.addressee]);
    const label = (id: string) => { const p = ps?.find((x) => x.id === id); return p?.username || p?.display_name?.trim() || "Seu amigo"; };
    const { pushToUser } = await import("@/lib/push-send.server");
    await pushToUser(f.requester, { title: "TaskBio", body: `${label(f.addressee)} agora é seu amigo no TaskBio 🎉`, url: `${APP}/amigos`, tag: "friend" });
    await pushToUser(f.addressee, { title: "TaskBio", body: `${label(f.requester)} agora é seu amigo no TaskBio 🎉`, url: `${APP}/amigos`, tag: "friend" });
    return { ok: true };
  });

/** Resolves an invite username to a public profile (no health data). */
export const inviterByUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ username: z.string().regex(/^[a-z0-9_.]{3,20}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("profiles").select("id, username, display_name, avatar_url").eq("username", data.username).maybeSingle();
    if (!p || p.id === context.userId) return null;
    return p;
  });

/** My friendships (status only), sent pending requests with names, nudges sent today and unseen nudges received. */
export const myFriendState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = context.userId;
    const today = brasiliaDay(new Date());
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fs } = await supabaseAdmin.from("friendships").select("id, requester, addressee, status").or(`requester.eq.${me},addressee.eq.${me}`);
    const sentIds = (fs ?? []).filter((f) => f.requester === me && f.status === "pending").map((f) => f.addressee);
    const { data: ps } = sentIds.length ? await supabaseAdmin.from("profiles").select("id, username, display_name, avatar_url").in("id", sentIds) : { data: [] };
    const { data: nudged } = await supabaseAdmin.from("nudges").select("recipient").eq("sender", me).eq("day", today);
    const { count } = await supabaseAdmin.from("nudges").select("id", { count: "exact", head: true }).eq("recipient", me).is("seen_at", null);
    return {
      relations: (fs ?? []).map((f) => ({ id: f.id, other: f.requester === me ? f.addressee : f.requester, status: f.status, mine: f.requester === me })),
      sent: (fs ?? []).filter((f) => f.requester === me && f.status === "pending").map((f) => ({ id: f.id, profile: (ps ?? []).find((p) => p.id === f.addressee) ?? null })),
      nudgedToday: (nudged ?? []).map((n) => n.recipient),
      nudgesReceived: count ?? 0,
    };
  });
