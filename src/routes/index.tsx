import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { AdSlot } from "@/components/AdSlot";
import { TodayPanel } from "@/components/TodayPanel";
import { QuickRegisterSheet } from "@/components/QuickRegisterSheet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — TaskBio" },
      {
        name: "description",
        content:
          "Veja o que importa hoje: pontuação do dia, sequência, treino, hábitos e atalhos para a sua rotina saudável.",
      },
      { property: "og:title", content: "Início — TaskBio" },
      {
        property: "og:description",
        content: "Organize alimentação, atividade física e rotina pessoal em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const { user, loading } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (loading) {
    return <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8"><div className="h-48 animate-pulse rounded-2xl bg-mist" /></main>;
  }

  return (
    <>
      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <TodayPanel />
        {!user && <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-sm text-steel"><span>Entre para salvar sua agenda e acessá-la em outros dispositivos.</span><Button asChild variant="outline" size="sm"><Link to="/auth">Entrar e sincronizar <ArrowRight /></Link></Button></div>}
        {installPrompt && !installed && <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm"><span>Instalar TaskBio neste aparelho</span><Button variant="outline" size="sm" onClick={async () => { const prompt = installPrompt as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }; await prompt.prompt(); await prompt.userChoice; setInstallPrompt(null); }}>Instalar</Button></div>}
      </main>
      <AdSlot page="/" slot="home-inline" />
      {user && <Button size="icon" className="fixed right-5 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 size-14 rounded-full border border-brand sm:right-8 xl:bottom-6" aria-label="Registrar agora" title="Registrar agora" onClick={() => setQuickOpen(true)}><Plus className="size-6" /></Button>}
      <QuickRegisterSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  );
}
