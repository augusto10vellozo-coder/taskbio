import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/liga")({
  beforeLoad: () => { throw redirect({ to: "/", replace: true }); },
});