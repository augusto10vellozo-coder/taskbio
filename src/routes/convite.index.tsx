import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/convite/")({
  beforeLoad: () => { throw redirect({ to: "/", replace: true }); },
});
