import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { trackProductEvent } from "@/lib/product-telemetry";

/** Records one activity marker per user per day, used for retention cohorts. */
export function ProductTelemetry() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading || !user) return;
    trackProductEvent("day_active", user.id);
  }, [loading, user?.id]);
  return null;
}
