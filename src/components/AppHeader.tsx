import { Link } from "@tanstack/react-router";
import { LogIn, Settings2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useThemePreference, type ThemePreference } from "@/lib/theme-context";

const links = [
  { to: "/", label: "Minha Agenda" },
  { to: "/atividades", label: "Atividades" },
  { to: "/alimentacao", label: "Alimentação" },
  { to: "/compras", label: "Compras" },
  { to: "/progresso", label: "Progresso" },
] as const;

export function AppHeader() {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useThemePreference();
  const [isAdmin, setIsAdmin] = useState(false);
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
    <header className="sticky top-0 z-30 glass-strong border-b border-white/40">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-ink ring-1 ring-black/5">
            <span className="font-display text-sm font-semibold text-white">TR</span>
          </div>
          <div className="leading-none">
            <p className="font-display text-[15px] font-semibold tracking-tight">Trilha</p>
            <p className="mt-0.5 text-[11px] text-steel">organização de vida saudável</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-lg px-3 py-2 font-medium text-steel hover:text-ink"
              activeProps={{ className: "rounded-lg px-3 py-2 font-medium bg-ink text-white" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Configurações" title="Configurações"><Settings2 /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Aparência</DropdownMenuLabel><DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemePreference)}><DropdownMenuRadioItem value="light">Claro</DropdownMenuRadioItem><DropdownMenuRadioItem value="dark">Escuro</DropdownMenuRadioItem><DropdownMenuRadioItem value="system">Seguir sistema</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
          {isAdmin && <Button asChild variant="ghost" size="sm"><Link to="/equipe">Equipe</Link></Button>}
          {!loading && user ? <>
            <span className="hidden text-[11px] font-medium text-steel sm:inline">Acesso gratuito</span>
            <Link to="/perfil" title="Abrir meu perfil" aria-label="Abrir meu perfil" className="grid size-9 place-items-center rounded-full bg-mist text-xs font-semibold text-steel ring-1 ring-black/5">{initials || <UserRound className="size-4" />}</Link>
          </> : !loading ? <Button asChild variant="outline" size="sm"><Link to="/auth"><LogIn /> Entrar</Link></Button> : <span className="size-9 animate-pulse rounded-full bg-mist" />}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-5 pb-2 text-sm md:hidden">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            activeOptions={{ exact: l.to === "/" }}
            className="shrink-0 rounded-lg px-3 py-1.5 font-medium text-steel"
            activeProps={{ className: "shrink-0 rounded-lg px-3 py-1.5 font-medium bg-ink text-white" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
