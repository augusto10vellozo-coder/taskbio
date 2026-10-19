import { Link, useLocation } from "@tanstack/react-router";
import { MoreHorizontal, Settings2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { MODULES, isModuleOn } from "@/lib/modules";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const SHORT_LABELS: Record<string, string> = {
  agenda: "Agenda",
  alimentacao: "Alimentos",
};

export function BottomNav() {
  const { modules } = useTaskBio();
  const { user } = useAuth();
  const pathname = useLocation().pathname;
  const enabled = MODULES.filter((m) => isModuleOn(modules, m.id));
  const primary = enabled.slice(0, 4);
  const rest = enabled.slice(4);

  const itemClass = (active: boolean) =>
    `flex h-14 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0 py-1 text-[10px] font-medium transition-colors ${active ? "bg-brand/10 text-brand-deep" : "text-steel"}`;

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <>
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] xl:hidden" />
      <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur xl:hidden">
        <div className="mx-auto grid max-w-lg auto-cols-fr grid-flow-col items-stretch gap-0.5 px-2 py-1">
          {primary.map((m) => (
            <Link key={m.id} to={m.to} className={itemClass(isActive(m.to))} aria-current={isActive(m.to) ? "page" : undefined}>
              <m.icon className="size-5 shrink-0" />
              <span className="max-w-full truncate">{SHORT_LABELS[m.id] ?? m.label}</span>
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" className={itemClass(false)} aria-label="Mais áreas">
                <MoreHorizontal className="size-5" />
                Mais
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="mb-2 w-56">
              {rest.map((m) => (
                <DropdownMenuItem key={m.id} asChild><Link to={m.to} className="flex items-center gap-2"><m.icon className="size-4 text-brand" />{m.label}</Link></DropdownMenuItem>
              ))}
              {rest.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem asChild><Link to="/modulos" className="flex items-center gap-2"><Settings2 className="size-4 text-brand" />Módulos</Link></DropdownMenuItem>
              {user && <DropdownMenuItem asChild><Link to="/amigos" className="flex items-center gap-2"><Users className="size-4 text-brand" />Amigos</Link></DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </>
  );
}

