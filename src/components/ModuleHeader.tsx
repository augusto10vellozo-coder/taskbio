import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ModuleHeader({ title }: { title: string }) {
  const router = useRouter();
  const goBack = () => {
    if (router.history.canGoBack()) router.history.back();
    else void router.navigate({ to: "/modulos", replace: true });
  };
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 pt-6 pb-4 sm:gap-4" data-module-header>
      <Button variant="outline" onClick={goBack} className="h-11 min-w-11 shrink-0 rounded-full border-line bg-mist/60 px-3 text-steel shadow-none hover:bg-mist hover:text-ink" aria-label="Voltar">
        <ArrowLeft /> Voltar
      </Button>
      <h1 className="min-w-0 break-words font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
    </div>
  );
}