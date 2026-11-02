import { supabase } from "@/integrations/supabase/client";
import { recordXp } from "@/lib/social.functions";
import { trackProductEvent } from "@/lib/product-telemetry";
import type { Block } from "@/lib/trilha-data";
import type { XpKind } from "@/lib/xp";

export const XP_EVENT = "taskbio:xp-changed";
const habitQueues = new Map<string, Promise<void>>();

/** Fire-and-forget XP sync for signed-in people; the server decides the points. */
export function emitXp(input: { kind: XpKind; ref: string; date: string; on: boolean; foodItems?: number; photoPath?: string }) {
  if (typeof window === "undefined") return;
  const send = async () => { await supabase.auth.getSession().then(async ({ data }) => {
    if (!data.session) return;
    try {
      if (input.kind === "habit" && input.on) {
        const id = input.ref.slice(0, -(input.date.length + 1));
        for (let attempt = 0; attempt < 12; attempt++) {
          const { data: stored } = await supabase.from("user_data").select("settings").eq("user_id", data.session.user.id).maybeSingle();
          const settings = stored?.settings as { habits?: { id: string }[] } | undefined;
          if (settings?.habits?.some(h => h.id === id)) break;
          await new Promise(resolve => window.setTimeout(resolve, 250));
        }
      }
      const res = await recordXp({ data: input });
      if (input.on && res.points > 0) trackProductEvent("first_block_done", data.session.user.id);
      window.dispatchEvent(new CustomEvent(XP_EVENT, { detail: res }));
    } catch { /* offline: points are not awarded later to keep the same-day rule */ }
  }); };
  if (input.kind !== "habit") { void send(); return; }
  const previous = habitQueues.get(input.ref) ?? Promise.resolve();
  const queued = previous.catch(() => {}).then(send);
  habitQueues.set(input.ref, queued);
  void queued.finally(() => { if (habitQueues.get(input.ref) === queued) habitQueues.delete(input.ref); }).catch(() => {});
}

export const foodItemCount = (b: Pick<Block, "manualMeal">) => (b.manualMeal?.items ?? []).filter((i) => i.foodId).length;

export function emitBlockXp(date: string, block: Block, on: boolean) {
  if (block.kind === "leitura") return;
  // Study blocks award XP through the study session, never as a generic block.
  if (block.subjectId) return;
  if (block.kind === "treino") emitXp({ kind: "workout", ref: block.id, date, on });
  else if (block.kind === "refeicao") emitXp({ kind: "meal", ref: block.id, date, on, foodItems: foodItemCount(block) });
  else emitXp({ kind: "block", ref: block.id, date, on });
}
