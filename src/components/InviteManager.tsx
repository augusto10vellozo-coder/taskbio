import { useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { acceptInviteCode } from "@/lib/social.functions";

export const INVITE_KEY = "taskbio:invite-ref";
export const INVITE_USER_KEY = "taskbio:invite-user";

/** After sign-in, connects the person to whoever invited them (/convite?ref=… or /convite/{username}). */
export function InviteManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) return;
    const who = localStorage.getItem(INVITE_USER_KEY);
    if (who) { localStorage.removeItem(INVITE_USER_KEY); navigate({ to: "/amigos", search: { add: who } as never }); }
    const code = localStorage.getItem(INVITE_KEY);
    if (!code) return;
    localStorage.removeItem(INVITE_KEY);
    acceptInviteCode({ data: { code } }).then((r) => {
      if (r.ok) toast.success(`Agora você e ${r.name || "seu amigo"} estão na mesma liga!`);
    }).catch(() => localStorage.setItem(INVITE_KEY, code));
  }, [user?.id]);
  return null;
}
