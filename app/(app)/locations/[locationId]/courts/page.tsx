"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LocationCourtBookingWizard } from "@/features/courts/components/location-court-booking-wizard";
import { useLocation, useLocationMembership } from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";

export default function LocationCourtsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const locationId = params.locationId as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const queryEnabled = !authLoading && isAuthenticated && !!locationId;

  const { data: location, isLoading: loadingLocation } = useLocation(locationId, {
    enabled: queryEnabled,
  });

  const isPrivate = location?.visibility === "private";
  const { data: membership, isLoading: loadingMembership } = useLocationMembership(locationId, {
    enabled: queryEnabled && isPrivate,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      const nextPath =
        pathname && pathname.startsWith("/") && !pathname.startsWith("//")
          ? pathname
          : `/locations/${locationId}/courts`;
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }, [authLoading, isAuthenticated, router, pathname, locationId]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GlobalLoadingPlaceholder minHeight="min-h-[60vh]" />
      </div>
    );
  }

  if (loadingLocation || (isPrivate && loadingMembership)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GlobalLoadingPlaceholder minHeight="min-h-[60vh]" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-7xl text-center">
        <p className="text-muted-foreground">Location not found.</p>
        <Link href="/">
          <Button variant="outline" className="mt-4 rounded-full">
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  if (isPrivate && membership && !membership.hasActiveMembership) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-lg text-center">
        <h1 className="text-2xl font-bold mb-2">Members only</h1>
        <p className="text-muted-foreground mb-6">
          <span className="font-medium text-foreground">{location.name}</span> is a private club. You
          need an active membership to view booking here.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  const venueTz = location.timezone?.trim() || "America/Chicago";

  return (
    <div className="container mx-auto py-12 px-4 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link href="/">
              <Button
                variant="ghost"
                className="mb-4 hover:bg-slate-100 dark:hover:bg-slate-800 -ml-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </Link>
            <h1 className="text-4xl font-bold text-foreground">{location.name}</h1>
            <p className="text-muted-foreground text-lg mt-2">
              Pick sport, court type, and time — then choose a court that still has space.
            </p>
          </div>
        </div>

        <LocationCourtBookingWizard
          locationId={locationId}
          locationName={location.name}
          locationTimezone={venueTz}
        />
      </motion.div>
    </div>
  );
}
