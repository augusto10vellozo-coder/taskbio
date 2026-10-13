import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/atividades")({
  beforeLoad: () => {
    throw redirect({ to: "/treino", search: { aba: "explorar" }, replace: true });
  },
});
