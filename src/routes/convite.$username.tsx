import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/convite/$username")({
  beforeLoad: () => { throw redirect({ to: "/", replace: true }); },
});
