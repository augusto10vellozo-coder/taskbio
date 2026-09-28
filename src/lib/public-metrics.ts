import { supabase } from "@/integrations/supabase/client";

export const PUBLIC_PATHS = ["/", "/sobre", "/contato", "/privacidade", "/termos"] as const;
export type PublicPath = typeof PUBLIC_PATHS[number];
export type PrivacyChoice = { analytics: boolean; version: 1 };

const STORAGE_KEY = "trilha:privacy-choice";
export const PRIVACY_EVENT = "trilha:privacy-updated";

export function readPrivacyChoice(): PrivacyChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as PrivacyChoice | null;
    return value?.version === 1 && typeof value.analytics === "boolean" ? value : null;
  } catch { return null; }
}

export function savePrivacyChoice(analytics: boolean) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics, version: 1 } satisfies PrivacyChoice));
  window.dispatchEvent(new CustomEvent(PRIVACY_EVENT));
}

export async function recordPublicEvent(pagePath: PublicPath, eventType: "page_view" | "ad_click", adSlot?: string) {
  if (!readPrivacyChoice()?.analytics) return;
  await supabase.from("public_events").insert({ page_path: pagePath, event_type: eventType, ad_slot: adSlot ?? null });
}