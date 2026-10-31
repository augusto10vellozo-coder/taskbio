import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";

const FLAG = "taskbio:notif-prompt";

/**
 * One-line notification opt-in shown after the first completed block ever —
 * never on first access, never repeated after deny/dismiss, at most once per session.
 */
export function NotificationPrompt() {
  const { user } = useAuth();
  const { plan, ready } = useTaskBio();
  const [visible, setVisible] = useState(false);
  const askedThisSession = useRef(false);

  const today = toDateKey(new Date());
  const hasCompletedBlock = (plan[today] ?? []).some((b) => b.done || b.mealConfirmedAt);

  useEffect(() => {
    if (!user || !ready || !hasCompletedBlock || askedThisSession.current) return;
    if (typeof Notification === "undefined" || Notification.permission !== "default") return;
    if (localStorage.getItem(FLAG)) return;
    askedThisSession.current = true;
    setVisible(true);
  }, [user, ready, hasCompletedBlock]);

  if (!visible) return null;

  const dismiss = (flag: string) => {
    localStorage.setItem(FLAG, flag);
    setVisible(false);
  };

  const activate = async () => {
    const { enableServerPush } = await import("@/lib/push-client");
    const result = await enableServerPush();
    if (result === "ok") {
      toast.success("Notificações ativadas");
      dismiss("granted");
    } else if (result === "denied") {
      dismiss("denied"); // não insistir
    } else {
      dismiss("shown");
    }
  };

  return (
    <div className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg rounded-2xl border border-line bg-card p-4 xl:bottom-6">
      <div className="flex items-center gap-3">
        <Bell className="size-5 shrink-0 text-accent" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-medium text-ink">Quer que eu te avise quando o dia estiver fechando?</p>
        <Button size="sm" onClick={() => void activate()}>Ativar</Button>
        <Button variant="ghost" size="icon" className="size-8 shrink-0 text-steel" onClick={() => dismiss("dismissed")} aria-label="Agora não"><X className="size-4" /></Button>
      </div>
    </div>
  );
}
