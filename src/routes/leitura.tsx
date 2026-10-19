import { createFileRoute } from "@tanstack/react-router";
import { ReadingModule } from "@/components/ReadingModule";

export const Route = createFileRoute("/leitura")({
  head: () => ({ meta: [
    { title: "Leitura — TaskBio" },
    { name: "description", content: "Registre minutos de leitura e acompanhe sua semana." },
    { property: "og:title", content: "Leitura — TaskBio" },
    { property: "og:description", content: "Minutos lidos por dia e por semana." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ReadingModule,
});
