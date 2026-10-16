import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { acceptInviteCode } from "@/lib/social.functions";

export const INVITE_KEY = "taskbio:invite-ref";

/** After sign-in, connects the person to whoever invited them through /convite?ref=… */
export function InviteManager() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const code = localStorage.getItem(INVITE_KEY);
    if (!code) return;
    localStorage.removeItem(INVITE_KEY);
    acceptInviteCode({ data: { code } }).then((r) => {
      if (r.ok) toast.success(`Agora você e ${r.name || "seu amigo"} estão na mesma liga!`);
    }).catch(() => localStorage.setItem(INVITE_KEY, code));
  }, [user?.id]);
  return null;
}
