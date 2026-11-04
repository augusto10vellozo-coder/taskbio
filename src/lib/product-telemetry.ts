import { supabase } from "@/integrations/supabase/client";
import { toDateKey } from "@/lib/calendar-utils";

export type ProductEvent = "day_active" | "onboarding_done" | "week_example_used" | "workout_imported" | "first_block_done";

const sent = new Set<string>();

/**
 * Records one product event for the signed-in user. Fire-and-forget: telemetry
 * never blocks or breaks a user action. The table has a unique key per user,
 * event and day, so duplicates are dropped by the database.
 */
export function trackProductEvent(event: ProductEvent, userId?: string | null): void {
  if (!userId) return;
  const key = `${userId}:${event}:${toDateKey(new Date())}`;
  if (sent.has(key)) return;
  sent.add(key);
  const storageKey = `taskbio:event:${key}`;
  try { if (localStorage.getItem(storageKey)) return; } catch { /* sem storage */ }
  // product_events is not in the generated Database types yet.
  const client = supabase as unknown as {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => PromiseLike<{ error: { code?: string; message: string } | null }>;
    };
  };
  void client
    .from("product_events")
    .insert({ user_id: userId, event })
    .then(({ error }) => {
      // 23505 = já existe para hoje: o evento está registrado, então não repetimos.
      if (!error || error.code === "23505") {
        try { localStorage.setItem(storageKey, "1"); } catch { /* sem storage */ }
        return;
      }
      sent.delete(key); // allow a later retry in the same session
    });
}
