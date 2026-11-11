import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { GeneralInfo, primaryLink, Screen } from "@/components/ui";

export const Route = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <Screen side="both" kicker="Not on the map" title="There is no screen here" back={false}>
      <p className="mt-3 text-lg leading-relaxed text-muted">
        The address may be mistyped, or it may point at something that was only ever on another device.
      </p>
      <Link to="/" {...primaryLink("mt-6")}>
        Back to Home
      </Link>
      <GeneralInfo />
    </Screen>
  );
}
