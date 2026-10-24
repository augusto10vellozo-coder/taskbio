import { createFileRoute } from "@tanstack/react-router";
import { ReadingModule } from "@/components/ReadingModule";

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
  component: ReadingModule,
});
