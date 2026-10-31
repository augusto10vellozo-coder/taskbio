import { Link } from "@tanstack/react-router";
import { LogIn, Settings2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useThemePreference, type ThemePreference } from "@/lib/theme-context";
import { defaultReminderPreferences, readReminderPreferences, saveReminderPreferences, type ReminderPreferences } from "@/lib/reminder-preferences";

import { MODULES, isModuleOn } from "@/lib/modules";
import { useTaskBio } from "@/lib/trilha-store";

export function AppHeader() {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useThemePreference();
  const { modules, setModule } = useTaskBio();
  const links = MODULES.filter((m) => isModuleOn(modules, m.id));
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
    <header className="sticky top-0 z-30 glass-strong border-b border-line">
      <div className="mx-auto grid min-h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 sm:px-8 xl:flex xl:justify-between">
        <div className="min-w-0">
          <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img src="/icons/taskbio-192-v3.png" alt="" width={36} height={36} className="size-9 shrink-0 rounded-xl ring-1 ring-line" />
          <div className="min-w-0 leading-none">
            <p className="font-display text-[15px] font-semibold tracking-tight">TaskBio</p>
            <p className="mt-0.5 truncate text-[10px] text-steel sm:text-[11px]">organização de vida saudável</p>
          </div>
        </Link>
        </div>

        <nav className="hidden min-w-0 flex-wrap items-center justify-center gap-1 py-2 text-sm xl:flex">
          {[
            { to: "/", label: "Hoje", exact: true },
            { to: "/rotina", label: "Rotina", exact: false },
            { to: "/progresso", label: "Progresso", exact: false },
            { to: "/perfil", label: "Perfil", exact: false },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              className="rounded-lg px-3 py-2 font-medium text-steel hover:text-ink"
              activeProps={{ className: "rounded-lg px-3 py-2 font-medium bg-ink text-background" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Configurações" title="Configurações"><Settings2 /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64"><DropdownMenuLabel>Módulos</DropdownMenuLabel>{MODULES.filter((m) => m.optional).map((m) => <DropdownMenuItem key={m.id} onSelect={(event) => { event.preventDefault(); setModule(m.id, !isModuleOn(modules, m.id)); }}>{isModuleOn(modules, m.id) ? "✓ " : "\u2003"}{m.label}</DropdownMenuItem>)}<DropdownMenuLabel className="mt-2">Aparência</DropdownMenuLabel><DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemePreference)}><DropdownMenuRadioItem value="light">Claro</DropdownMenuRadioItem><DropdownMenuRadioItem value="dark">Escuro</DropdownMenuRadioItem><DropdownMenuRadioItem value="system">Seguir sistema</DropdownMenuRadioItem></DropdownMenuRadioGroup><DropdownMenuLabel className="mt-2">Lembretes neste aparelho</DropdownMenuLabel><DropdownMenuItem onSelect={(event) => { event.preventDefault(); updateReminders({ ...reminders, enabled: !reminders.enabled }); }}>{reminders.enabled ? "Desativar todos" : "Ativar lembretes"}</DropdownMenuItem>{reminders.enabled && <><DropdownMenuItem onSelect={(event) => { event.preventDefault(); updateReminders({ ...reminders, dailyEnabled: !reminders.dailyEnabled }); }}>{reminders.dailyEnabled ? "✓ " : ""}Planejar dia seguinte</DropdownMenuItem><DropdownMenuItem onSelect={(event) => { event.preventDefault(); updateReminders({ ...reminders, workoutEnabled: !reminders.workoutEnabled }); }}>{reminders.workoutEnabled ? "✓ " : ""}Lembretes de treino</DropdownMenuItem><DropdownMenuItem onSelect={(event) => { event.preventDefault(); updateReminders({ ...reminders, streakEnabled: !reminders.streakEnabled }); }}>{reminders.streakEnabled ? "✓ " : ""}Aviso à noite se nada foi marcado</DropdownMenuItem>{reminders.streakEnabled && <div className="px-2 py-1.5 text-xs text-steel"><label>Horário do aviso<input type="time" value={reminders.streakTime} onChange={(event) => updateReminders({ ...reminders, streakTime: event.target.value })} className="mt-1 h-8 w-full rounded-md bg-background px-2 ring-1 ring-line" /></label></div>}<div className="px-2 py-1.5 text-xs text-steel"><label>Horário diário<input type="time" value={reminders.dailyTime} onChange={(event) => updateReminders({ ...reminders, dailyTime: event.target.value })} className="mt-1 h-8 w-full rounded-md bg-background px-2 ring-1 ring-line" /></label></div></>}</DropdownMenuContent></DropdownMenu>
          {isAdmin && <Button asChild variant="ghost" size="sm"><Link to="/equipe">Equipe</Link></Button>}
          {!loading && user ? <>
            <span className="hidden text-[11px] font-medium text-steel sm:inline">Acesso gratuito</span>
            <Link to="/perfil" title="Abrir meu perfil" aria-label="Abrir meu perfil" className="grid size-9 place-items-center rounded-full bg-mist text-xs font-semibold text-steel ring-1 ring-line">{initials || <UserRound className="size-4" />}</Link>
          </> : !loading ? <Button asChild variant="outline" size="sm"><Link to="/auth"><LogIn /> Entrar</Link></Button> : <span className="size-9 animate-pulse rounded-full bg-mist" />}
        </div>
      </div>

    </header>
  );
}
