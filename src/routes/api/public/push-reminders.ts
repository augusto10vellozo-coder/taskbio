import { createFileRoute } from "@tanstack/react-router";
import { buildPushPayload } from "@block65/webcrypto-web-push";
import { dueDayClose, dueLeagueOpen, dueMealReminders, dueReminders, dueSettingsReminders, dueStreakRisk, inQuietHours, readNotifPrefs, wallClockMs } from "@/lib/push-reminders";
import { VAPID_PUBLIC_KEY } from "@/lib/push-config";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/push-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
        if (!token) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: secret } = await supabaseAdmin.from("push_cron_token").select("token").eq("id", 1).maybeSingle();
        if (!secret || !safeEqual(token, secret.token)) return new Response("Unauthorized", { status: 401 });

        const privateKey = process.env["VAPID_PRIVATE_KEY"];
        if (!privateKey) return new Response("Server configuration error", { status: 500 });
        const vapid = { subject: "mailto:contatotaskbio@gmail.com", publicKey: VAPID_PUBLIC_KEY, privateKey };

        const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth, timezone");
        if (!subs?.length) return Response.json({ sent: 0 });
        const userIds = [...new Set(subs.map((s) => s.user_id))];
        const { data: rows } = await supabaseAdmin.from("user_data").select("user_id, plan, settings").in("user_id", userIds);
        const now = new Date();
        const todaySp = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        const lastWeekStart = (() => { const d = new Date(`${todaySp}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - d.getUTCDay() - 7); return d.toISOString().slice(0, 10); })();
        const [{ data: xpRows }, { data: freezeRows }, { data: winRows }, { data: friendRows }] = await Promise.all([
          supabaseAdmin.from("xp_events").select("user_id, points").in("user_id", userIds).eq("day", todaySp),
          supabaseAdmin.from("streak_freezes").select("user_id, day").in("user_id", userIds),
          supabaseAdmin.from("league_wins").select("user_id").in("user_id", userIds),
          supabaseAdmin.from("friendships").select("requester, addressee").eq("status", "accepted").or(userIds.map((id) => `requester.eq.${id},addressee.eq.${id}`).join(",")),
        ]);
        const todayXp = new Map<string, number>();
        for (const e of xpRows ?? []) todayXp.set(e.user_id, (todayXp.get(e.user_id) ?? 0) + e.points);
        const freezesBy = new Map<string, string[]>();
        for (const f of freezeRows ?? []) freezesBy.set(f.user_id, [...(freezesBy.get(f.user_id) ?? []), f.day]);
        const winsBy = new Map<string, number>();
        for (const w of winRows ?? []) winsBy.set(w.user_id, (winsBy.get(w.user_id) ?? 0) + 1);
        const friendsBy = new Map<string, string[]>();
        for (const f of friendRows ?? []) {
          friendsBy.set(f.requester, [...(friendsBy.get(f.requester) ?? []), f.addressee]);
          friendsBy.set(f.addressee, [...(friendsBy.get(f.addressee) ?? []), f.requester]);
        }
        // Last week's XP per user (for Monday league-opening position).
        const { data: lastWeekXp } = await supabaseAdmin.from("xp_events").select("user_id, points, day").in("user_id", userIds).gte("day", lastWeekStart).lte("day", todaySp);
        const weekXp = new Map<string, number>();
        for (const e of lastWeekXp ?? []) if (e.day <= lastWeekStart.slice(0, 8) + String(Number(lastWeekStart.slice(8)) + 6).padStart(2, "0") || e.day >= lastWeekStart) weekXp.set(e.user_id, (weekXp.get(e.user_id) ?? 0) + e.points);
        let sent = 0;

        for (const row of rows ?? []) {
          const userSubs = subs.filter((s) => s.user_id === row.user_id);
          const tz = userSubs[0]?.timezone ?? "America/Sao_Paulo";
          const settings = row.settings && typeof row.settings === "object" && !Array.isArray(row.settings) ? row.settings as Record<string, unknown> : {};
          const prefs = readNotifPrefs(settings);
          const frozenDays = freezesBy.get(row.user_id) ?? [];
          const freezesAvailable = Math.max(0, (winsBy.get(row.user_id) ?? 0) - frozenDays.length);
          const due: { key: string; title: string; body: string; url: string }[] = [];
          if (!inQuietHours(Date.now())) {
            if (prefs.streak) due.push(...dueStreakRisk({ plan: row.plan, habitLog: settings["habitLog"], habits: settings["habits"], frozenDays, freezesAvailable }, tz, now));
            if (prefs.dayClose) due.push(...dueDayClose(row.plan, todayXp.get(row.user_id) ?? 0, tz, now));
            if (prefs.meals) due.push(...dueMealReminders(row.plan, tz, now));
            if (prefs.league) {
              const group = [row.user_id, ...(friendsBy.get(row.user_id) ?? [])];
              const ranked = group.map((id) => ({ id, xp: weekXp.get(id) ?? 0 })).sort((a, b) => b.xp - a.xp);
              const pos = ranked.findIndex((r) => r.id === row.user_id) + 1;
              due.push(...dueLeagueOpen(group.length >= 2 ? pos : null, tz, now));
            }
          }
          due.push(...dueReminders(row.plan, tz, now, prefs), ...dueSettingsReminders(row.settings, tz, now));
          for (const reminder of due) {
            const { error: dup } = await supabaseAdmin.from("push_sent").insert({ user_id: row.user_id, reminder_key: reminder.key });
            if (dup) continue; // already sent
            for (const sub of userSubs) {
              try {
                const payload = await buildPushPayload(
                  { data: JSON.stringify({ title: reminder.title, body: reminder.body, url: reminder.url }), options: { ttl: 900, urgency: "high" } },
                  { endpoint: sub.endpoint, expirationTime: null, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  vapid,
                );
                const res = await fetch(sub.endpoint, payload);
                if (res.status === 404 || res.status === 410) await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
                else if (res.ok) sent++;
                else console.error(`Push failed [${res.status}]: ${await res.text()}`);
              } catch (error) { console.error("Push error", error); }
            }
          }
        }
        await supabaseAdmin.from("push_sent").delete().lt("sent_at", new Date(Date.now() - 3 * 86400000).toISOString());
        return Response.json({ sent });
      },
    },
  },
});
