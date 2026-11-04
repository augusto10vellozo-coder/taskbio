import { createFileRoute, redirect } from "@tanstack/react-router";

/** A visão do dia vive na home; esta rota antiga só redireciona para lá. */
export const Route = createFileRoute("/hoje")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
