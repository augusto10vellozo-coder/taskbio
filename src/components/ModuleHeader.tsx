import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHierarchicalBack } from "@/lib/navigation-context";

export function ModuleHeader({ title }: { title: string }) {
  const { canReturn, back } = useHierarchicalBack();
  return (
    <div className="flex items-center gap-2 pt-6 pb-4" data-module-header>
      {canReturn && <Button variant="ghost" size="icon" onClick={back} aria-label="Voltar" title="Voltar" className="size-11 shrink-0 border-0 bg-transparent shadow-none hover:bg-transparent text-ink [&_svg]:size-5"><ChevronLeft strokeWidth={1.5} /></Button>}
      <h1 className="min-w-0 break-words font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
    </div>
  );
}
