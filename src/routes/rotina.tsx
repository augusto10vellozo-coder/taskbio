import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/rotina")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});