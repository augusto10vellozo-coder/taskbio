import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { brasiliaDay, xpFor } from "@/lib/xp";

const xpInput = z.object({
  kind: z.enum(["habit", "block", "meal", "workout", "photo", "reading"]),
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
    await pushToUser(owner.id, { title: "TaskBio", body: `👋 ${me?.display_name?.trim() || "Um amigo"} entrou na sua liga`, url: "/amigos", tag: "invite" });
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
    await pushToUser(b, { title: "TaskBio", body: `👋 ${me?.display_name?.trim() || "Um amigo"} te chamou pra liga`, url: "/amigos", tag: "invite" });
    return { ok: true };
  });
