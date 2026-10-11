import { Link } from "@tanstack/react-router";
import { LogIn, Settings2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useThemePreference, type ThemePreference } from "@/lib/theme-context";
import { defaultReminderPreferences, readReminderPreferences, saveReminderPreferences, type ReminderPreferences } from "@/lib/reminder-preferences";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useThemePreference();
  const [isAdmin, setIsAdmin] = useState(false);
  const [reminders, setReminders] = useState<ReminderPreferences>(defaultReminderPreferences);
  useEffect(() => setReminders(readReminderPreferences()), []);
  async function updateReminders(next: ReminderPreferences) {
    if (next.enabled && "Notification" in window && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }
    saveReminderPreferences(next); setReminders(next);
  }
  useEffect(() => {
    let active = true;
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then(({ data }) => { if (active) setIsAdmin(data?.role === "admin"); });
    return () => { active = false; setIsAdmin(false); };
  }, [user?.id]);
  const displayName = typeof user?.user_metadata?.["display_name"] === "string"
    ? user.user_metadata["display_name"]
    : user?.email?.split("@")[0];
  const initials = displayName?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3"><SidebarTrigger aria-label="Abrir ou recolher menu" title="Abrir ou recolher menu" /><span className="truncate text-xs font-medium text-steel">TaskBio <span className="hidden sm:inline">/ Seu dia em equilíbrio</span></span></div>

        <div className="flex items-center gap-2">
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Configurações" title="Configurações"><Settings2 /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64"><DropdownMenuLabel>Aparência</DropdownMenuLabel><DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemePreference)}><DropdownMenuRadioItem value="light">Claro</DropdownMenuRadioItem><DropdownMenuRadioItem value="dark">Escuro</DropdownMenuRadioItem><DropdownMenuRadioItem value="system">Seguir sistema</DropdownMenuRadioItem></DropdownMenuRadioGroup><DropdownMenuLabel className="mt-2">Lembretes neste aparelho</DropdownMenuLabel><DropdownMenuItem onSelect={(event) => { event.preventDefault(); updateReminders({ ...reminders, enabled: !reminders.enabled }); }}>{reminders.enabled ? "Desativar todos" : "Ativar lembretes"}</DropdownMenuItem>{reminders.enabled && <><DropdownMenuItem onSelect={(event) => { event.preventDefault(); updateReminders({ ...reminders, dailyEnabled: !reminders.dailyEnabled }); }}>{reminders.dailyEnabled ? "✓ " : ""}Planejar dia seguinte</DropdownMenuItem><DropdownMenuItem onSelect={(event) => { event.preventDefault(); updateReminders({ ...reminders, workoutEnabled: !reminders.workoutEnabled }); }}>{reminders.workoutEnabled ? "✓ " : ""}Lembretes de treino</DropdownMenuItem><div className="px-2 py-1.5 text-xs text-steel"><label>Horário diário<input type="time" value={reminders.dailyTime} onChange={(event) => updateReminders({ ...reminders, dailyTime: event.target.value })} className="mt-1 h-8 w-full rounded-md bg-background px-2 ring-1 ring-line" /></label></div></>}</DropdownMenuContent></DropdownMenu>
          {isAdmin && <Button asChild variant="ghost" size="sm"><Link to="/equipe">Equipe</Link></Button>}
          {!loading && user ? <>
            <span className="hidden text-[11px] font-medium text-steel sm:inline">Acesso gratuito</span>
            <Link to="/perfil" title="Abrir meu perfil" aria-label="Abrir meu perfil" className="grid size-9 place-items-center rounded-full bg-mist text-xs font-semibold text-steel ring-1 ring-black/5">{initials || <UserRound className="size-4" />}</Link>
          </> : !loading ? <Button asChild variant="outline" size="sm"><Link to="/auth"><LogIn /> Entrar</Link></Button> : <span className="size-9 animate-pulse rounded-full bg-mist" />}
        </div>
      </div>

    </header>
  );
}
