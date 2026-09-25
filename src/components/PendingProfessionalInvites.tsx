import { useEffect, useState } from "react";
import { UserRoundCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type Invite = { id: string };

export function PendingProfessionalInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  useEffect(() => {
    if (!user?.email) { setInvites([]); return; }
    supabase.from("professional_clients").select("id").is("client_id", null).eq("status", "pending").ilike("invite_email", user.email).then(({ data }) => setInvites((data as Invite[] | null) ?? []));
  }, [user?.email]);
  async function respond(id: string, accept: boolean) {
    if (!user) return;
    const { error } = await supabase.from("professional_clients").update({ client_id: user.id, status: accept ? "active" : "declined" }).eq("id", id);
    if (error) { toast.error("Não foi possível responder ao convite."); return; }
    setInvites((current) => current.filter((item) => item.id !== id)); toast.success(accept ? "Acompanhamento autorizado." : "Convite recusado.");
  }
  if (!invites.length) return null;
  const firstInvite = invites[0];
  if (!firstInvite) return null;
  return <aside className="fixed inset-x-4 bottom-16 z-40 mx-auto max-w-lg rounded-lg bg-card p-4 shadow-lg ring-1 ring-line"><p className="text-sm font-semibold">Convite de acompanhamento profissional</p><p className="mt-1 text-xs text-steel">Aceite apenas se reconhecer o profissional. Você poderá encerrar o vínculo depois.</p><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => respond(firstInvite.id, true)}><UserRoundCheck /> Aceitar</Button><Button size="sm" variant="outline" onClick={() => respond(firstInvite.id, false)}><X /> Recusar</Button></div></aside>;
}