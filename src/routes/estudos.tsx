import { createFileRoute } from "@tanstack/react-router";
import { StudyModule } from "@/components/StudyModule";
import { ModuleGate } from "@/components/EmptyState";
import { ModuleHeader } from "@/components/ModuleHeader";
import { useTaskBio } from "@/lib/trilha-store";
import { isModuleOn } from "@/lib/modules";

export const Route = createFileRoute("/estudos")({
  head: () => ({ meta: [
    { title: "Estudos — TaskBio" },
    { name: "description", content: "Registre sessões de estudo e acompanhe os minutos da semana." },
    { property: "og:title", content: "Estudos — TaskBio" },
    { property: "og:description", content: "Sessões de estudo por dia e por semana." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Estudos,
});

function Estudos() {
  const { modules } = useTaskBio();
  if (isModuleOn(modules, "estudos")) return <StudyModule />;
  return <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8"><ModuleHeader title="Estudos" /><ModuleGate id="estudos"><StudyModule /></ModuleGate></main>;
}
