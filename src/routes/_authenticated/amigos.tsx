import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/amigos")({
  beforeLoad: () => { throw redirect({ to: "/", replace: true }); },
});
