import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { emitXp } from "@/lib/xp-client";
import type { Block } from "@/lib/trilha-data";

/** Optional photo for a meal or workout: saved with the record and worth +5 XP on the same day. */
export function PhotoBonus({ date, block }: { date: string; block: Block }) {
  const { user } = useAuth();
  const { updateBlock } = useTaskBio();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (!user || (block.kind !== "refeicao" && block.kind !== "treino")) return null;
  if (block.photoPath) return <span className="text-[11px] text-good" title="Foto anexada">📷</span>;
  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) { toast.error("A foto deve ter até 5 MB."); return; }
    setBusy(true);
    const path = `${user!.id}/${date}/${block.id}-${Date.now()}.${file.type.split("/")[1] ?? "jpg"}`;
    const { error } = await supabase.storage.from("xp-photos").upload(path, file, { contentType: file.type });
    setBusy(false);
    if (error) { toast.error("Não foi possível enviar a foto."); return; }
    const { id: _id, done: _done, ...rest } = block;
    updateBlock(date, block.id, { ...rest, photoPath: path });
    emitXp({ kind: "photo", ref: block.id, date, on: true, photoPath: path });
    toast.success("Foto anexada");
  }
  return <>
    <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
    <button type="button" disabled={busy} onClick={() => input.current?.click()} className="grid size-7 place-items-center text-steel hover:text-ink" aria-label="Anexar foto (+5 XP)" title="Anexar foto (+5 XP)"><Camera className="size-3.5" /></button>
  </>;
}
