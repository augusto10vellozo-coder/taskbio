import { createFileRoute } from "@tanstack/react-router";
import { StudyModule } from "@/components/StudyModule";
import { ModuleGate } from "@/components/EmptyState";

export const Route = createFileRoute("/estudos")({
  head: () => ({ meta: [
    { title: "Estudos — TaskBio" },
    { name: "description", content: "Registre sessões de estudo e acompanhe os minutos da semana." },
    { property: "og:title", content: "Estudos — TaskBio" },
    { property: "og:description", content: "Sessões de estudo por dia e por semana." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <ModuleGate id="estudos"><StudyModule /></ModuleGate>,
});
