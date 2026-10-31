import { createFileRoute } from "@tanstack/react-router";
import { ReadingModule } from "@/components/ReadingModule";
import { ModuleGate } from "@/components/EmptyState";
import { ModuleHeader } from "@/components/ModuleHeader";
import { useTaskBio } from "@/lib/trilha-store";
import { isModuleOn } from "@/lib/modules";

export const Route = createFileRoute("/leitura")({
  validateSearch: (search: Record<string, unknown>): { blockId?: string | undefined; date?: string | undefined } => ({
    blockId: typeof search['blockId'] === "string" ? search['blockId'] : undefined,
    date: typeof search['date'] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search['date']) ? search['date'] : undefined,
  }),
  head: () => ({ meta: [
    { title: "Leitura — TaskBio" },
    { name: "description", content: "Organize sua estante, registre páginas ou percentual e acompanhe metas e sequências de leitura." },
    { property: "og:title", content: "Leitura — TaskBio" },
    { property: "og:description", content: "Sua estante, sessões, metas e sequências de leitura no TaskBio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Leitura,
});

function Leitura() {
  const { modules } = useTaskBio();
  if (isModuleOn(modules, "leitura")) return <ReadingModule />;
  return <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8"><ModuleHeader title="Leitura" /><ModuleGate id="leitura"><ReadingModule /></ModuleGate></main>;
}
