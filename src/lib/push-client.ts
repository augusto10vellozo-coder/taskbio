import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY } from "./push-config";

export type PushResult = "ok" | "unsupported" | "ios-install" | "frame" | "denied" | "signed-out" | "error";

function keyToBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function enableServerPush(): Promise<PushResult> {
  if (window.top !== window.self) return "frame";
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return isIOS && !standalone ? "ios-install" : "unsupported";
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "signed-out";
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  try {
    const registration = await navigator.serviceWorker.register("/push-sw.js");
    await navigator.serviceWorker.ready;
    const subscription = (await registration.pushManager.getSubscription())
      ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) });
    const json = subscription.toJSON();
    let deviceId = localStorage.getItem("taskbio:push-device");
    if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem("taskbio:push-device", deviceId); }
    const deviceLabel = `${isIOS ? "iPhone/iPad" : /Android/.test(navigator.userAgent) ? "Android" : "Computador"} · ${standalone ? "Tela de início" : "Navegador"}`;
    const { error } = await supabase.from("push_subscriptions").upsert({
      user_id: user.id,
      device_id: deviceId,
      device_label: deviceLabel,
      updated_at: new Date().toISOString(),
      active: true,
      inactive_reason: null,
      endpoint: subscription.endpoint,
      p256dh: json.keys?.["p256dh"] ?? "",
      auth: json.keys?.["auth"] ?? "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
    }, { onConflict: "endpoint" });
    if (error) return "error";
    const { error: duplicateError } = await supabase.from("push_subscriptions").update({ active: false, inactive_reason: "duplicate_device" }).eq("user_id", user.id).eq("device_id", deviceId).neq("endpoint", subscription.endpoint);
    return duplicateError ? "error" : "ok";
  } catch (error) {
    console.error(error);
    return "error";
  }
}

export async function disableServerPush() {
  const registration = await navigator.serviceWorker?.getRegistration("/push-sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  }
}
