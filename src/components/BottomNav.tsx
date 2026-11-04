import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Home, Layers, UserRound } from "lucide-react";

/** Module screens that highlight the "Rotina" tab when opened directly by URL. */
const ROTINA_PATHS = [
  "/rotina",
  "/agenda",
  "/hoje",
  "/treino",
  "/alimentacao",
  "/saude",
  "/leitura",
  "/estudos",
  "/habitos",
  "/compras",
  "/financas",
  "/metas",
  "/calendario",
  "/atividades",
  "/modulos",
];

const ITEMS = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/rotina", label: "Rotina", icon: Layers },
  { to: "/progresso", label: "Progresso", icon: BarChart3 },
  { to: "/perfil", label: "Perfil", icon: UserRound },
] as const;

export function BottomNav() {
  const pathname = useLocation().pathname;

  const isActive = (to: string) => {
    if (to === "/") return pathname === "/";
    if (to === "/rotina") return ROTINA_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  return (
    <>
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] xl:h-0" />
      <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background pb-[env(safe-area-inset-bottom)] xl:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 items-stretch px-2 py-1">
          {ITEMS.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                state={{ taskbioTab: true }}
                className={`flex min-h-11 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[11px] transition-colors ${active ? "font-semibold text-ink" : "font-medium text-faint"}`}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className={`size-5 shrink-0 ${active ? "text-accent" : ""}`} strokeWidth={1.5} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
