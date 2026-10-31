import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/amigos")({
  beforeLoad: () => { throw redirect({ to: "/", replace: true }); },
});
