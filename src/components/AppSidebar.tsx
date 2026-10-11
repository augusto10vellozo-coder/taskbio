import { Link, useRouterState } from "@tanstack/react-router";
import { Apple, CalendarDays, ChartNoAxesCombined, Dumbbell, Heart, ShoppingBasket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

const items = [
  { to: "/", label: "Minha Agenda", icon: CalendarDays },
  { to: "/atividades", label: "Atividades", icon: Dumbbell },
  { to: "/alimentacao", label: "Alimentação", icon: Apple },
  { to: "/compras", label: "Compras", icon: ShoppingBasket },
  { to: "/progresso", label: "Progresso", icon: ChartNoAxesCombined },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { setOpenMobile, isMobile } = useSidebar();
  return <Sidebar collapsible="icon" className="border-r border-sidebar-border">
    <SidebarHeader className="h-24 justify-center px-4 group-data-[collapsible=icon]:px-1">
      <div className="flex items-center gap-3">
        <Link to="/" onClick={() => setOpenMobile(false)} className="flex min-w-0 items-center gap-3">
          <img src="/icons/taskbio-192.png" alt="" className="size-9 shrink-0 rounded-lg" />
          <span className="font-display text-2xl font-semibold group-data-[collapsible=icon]:hidden">TaskBio<span className="mt-1 block font-body text-[10px] font-medium text-muted-foreground">ORGANIZAÇÃO DE VIDA SAUDÁVEL</span></span>
        </Link>
        {isMobile && <Button variant="ghost" size="icon" aria-label="Fechar menu" onClick={() => setOpenMobile(false)}><X /></Button>}
      </div>
    </SidebarHeader>
    <SidebarContent className="px-3 pt-6 group-data-[collapsible=icon]:px-1">
      <p className="mb-4 px-3 text-[10px] font-semibold text-muted-foreground group-data-[collapsible=icon]:hidden">MEU ESPAÇO</p>
      <SidebarMenu className="gap-2">{items.map((item) => <SidebarMenuItem key={item.to}>
        <SidebarMenuButton asChild isActive={path === item.to} tooltip={item.label} className="h-11 px-3 font-medium data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground">
          <Link to={item.to} onClick={() => setOpenMobile(false)}><item.icon /><span>{item.label}</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>)}</SidebarMenu>
    </SidebarContent>
    <SidebarFooter className="gap-5 border-t border-sidebar-border px-6 py-6 group-data-[collapsible=icon]:px-2">
      <Heart className="size-5 text-primary" />
      <p className="text-xs leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">Sua rotina, no seu ritmo.</p>
      <Button asChild variant="link" className="h-auto justify-start p-0 text-xs group-data-[collapsible=icon]:hidden"><Link to="/sobre" onClick={() => setOpenMobile(false)}>Sobre o TaskBio</Link></Button>
    </SidebarFooter>
  </Sidebar>;
}