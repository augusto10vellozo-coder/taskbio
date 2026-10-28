import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useHabitFreezes } from "@/lib/use-habit-freezes";
import { acknowledgeHabitFreezes } from "@/lib/habit-freezes.functions";

export function HabitFreezeNotices() {
  const { data } = useHabitFreezes();
  const ack = useServerFn(acknowledgeHabitFreezes);
  const shown = useRef(new Set<string>());
  useEffect(() => {
    const notices = (data?.notices ?? []).filter(n => !shown.current.has(n.id));
    if (!notices.length) return;
    for (const n of notices) {
      shown.current.add(n.id);
      toast(n.kind === "use" ? "❄️ Sua sequência foi salva · 1 congelamento usado" : `Sua sequência de ${n.streak} dias terminou`, { id: n.id, duration: 8000 });
    }
    void ack({ data: { ids: notices.map(n => n.id) } }).catch(() => { for (const n of notices) shown.current.delete(n.id); });
  }, [data, ack]);
  return null;
}