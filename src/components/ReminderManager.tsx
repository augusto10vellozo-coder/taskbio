import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

// Legacy local timers are disabled: server preferences are the single authority.
export function ReminderManager() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    let busy = false;
    const renew = async () => {
      if (busy || document.visibilityState !== "visible" || !("Notification" in window) || Notification.permission !== "granted") return;
      busy = true;
      try {
        const { enableServerPush } = await import("@/lib/push-client");
        await enableServerPush();
      } finally { busy = false; }
    };
    void renew();
    document.addEventListener("visibilitychange", renew);
    window.addEventListener("focus", renew);
    return () => {
      document.removeEventListener("visibilitychange", renew);
      window.removeEventListener("focus", renew);
    };
  }, [user?.id]);
  return null;
}
