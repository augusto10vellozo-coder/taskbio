import { buildPushPayload } from "@block65/webcrypto-web-push";
import { VAPID_PUBLIC_KEY } from "@/lib/push-config";

/** Sends one Web Push message to every device of a user. Errors are logged, never thrown. */
export async function pushToUser(userId: string, message: { title: string; body: string; url: string; tag?: string }) {
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!privateKey) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId).eq("active", true);
  const vapid = { subject: "mailto:contatotaskbio@gmail.com", publicKey: VAPID_PUBLIC_KEY, privateKey };
  for (const sub of subs ?? []) {
    try {
      const payload = await buildPushPayload(
        { data: JSON.stringify(message), options: { ttl: 3600, urgency: "normal" } },
        { endpoint: sub.endpoint, expirationTime: null, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        vapid,
      );
      const res = await fetch(sub.endpoint, payload);
      if (res.status === 404 || res.status === 410) await supabaseAdmin.from("push_subscriptions").update({ active: false, inactive_reason: `http_${res.status}` }).eq("id", sub.id);
    } catch (error) { console.error("Push error", error); }
  }
}
