import { createFileRoute } from "@tanstack/react-router";
import { buildPushPayload } from "@block65/webcrypto-web-push";
import { dueReminders } from "@/lib/push-reminders";
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
        const { data: rows } = await supabaseAdmin.from("user_data").select("user_id, plan").in("user_id", userIds);
        const now = new Date();
        let sent = 0;

        for (const row of rows ?? []) {
          const userSubs = subs.filter((s) => s.user_id === row.user_id);
          const due = dueReminders(row.plan, userSubs[0]?.timezone ?? "America/Sao_Paulo", now);
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
