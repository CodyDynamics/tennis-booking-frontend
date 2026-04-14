"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  LocationCourtBookingWizard,
  type LocationBookingPrefill,
} from "@/features/courts/components/location-court-booking-wizard";
import { LocationMyBookingsSidebar } from "@/features/courts/components/location-my-bookings-sidebar";
import {
  useAreas,
  useLocation,
  useLocationMembership,
  useMyCourtBookings,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";
import type { CourtBooking } from "@/types";
import toast from "react-hot-toast";

export default function LocationCourtsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationId = params.locationId as string;
  const selectedAreaId = searchParams.get("areaId");
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [prefill, setPrefill] = useState<LocationBookingPrefill | null>(null);
  const prefillIdRef = useRef(0);
  const redirectedRef = useRef(false);
  const { data: myBookings = [], isLoading: loadingMyBookings } = useMyCourtBookings(user?.id);
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(true);

  const queryEnabled = !authLoading && isAuthenticated && !!locationId;

  const { data: location, isLoading: loadingLocation } = useLocation(locationId, {
    enabled: queryEnabled,
  });
  const { data: areas = [], isLoading: loadingAreas } = useAreas(locationId);
  const selectedArea = selectedAreaId
    ? areas.find((a) => a.id === selectedAreaId)
    : undefined;

  const isPrivate = location?.visibility === "private";
  const needsMembershipByArea = selectedArea?.visibility === "private";
  const mustCheckMembership = isPrivate || needsMembershipByArea;
  const { data: membership, isLoading: loadingMembership } = useLocationMembership(locationId, {
    enabled: queryEnabled && mustCheckMembership,
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

  useEffect(() => {
    if (!selectedAreaId || loadingAreas) return;
    if (!selectedArea) {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      toast.error("Area not found or not available.");
      router.replace("/");
      return;
    }
    if (!mustCheckMembership || loadingMembership) return;
    if (membership && !membership.hasActiveMembership) {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      toast.error("Members only area. Please subscribe to continue.");
      router.replace("/");
    }
  }, [
    selectedAreaId,
    selectedArea,
    loadingAreas,
    mustCheckMembership,
    loadingMembership,
    membership,
    router,
  ]);

  useEffect(() => {
    if (!bookingDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (window.matchMedia("(min-width: 1180px)").matches) return;
      setBookingDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bookingDrawerOpen]);

  const handleReschedule = (b: CourtBooking) => {
    const sport = b.sport;
    const courtType = b.courtType;
    if (!sport || (courtType !== "indoor" && courtType !== "outdoor")) return;
    prefillIdRef.current += 1;
    setPrefill({
      requestId: prefillIdRef.current,
      sport,
      courtType,
      bookingDate: b.bookingDate.slice(0, 10),
      durationMinutes: b.durationMinutes,
      startTime: b.startTime,
      endTime: b.endTime,
      editingBookingId: b.id,
    });
  };

  const clearPrefill = useCallback(() => setPrefill(null), []);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GlobalLoadingPlaceholder minHeight="min-h-[60vh]" />
      </div>
    );
  }

  if (loadingLocation || loadingAreas || (mustCheckMembership && loadingMembership)) {
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

  if (mustCheckMembership && membership && !membership.hasActiveMembership) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-lg text-center">
        <h1 className="text-2xl font-bold mb-2">Members only</h1>
        <p className="text-muted-foreground mb-6">
          <span className="font-medium text-foreground">
            {selectedArea?.name || location.name}
          </span>{" "}
          is members-only. You need an active membership to view booking here.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  const venueTz = location.timezone?.trim() || "America/Chicago";

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] py-8 pt-2 px-4 sm:px-4 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative max-w-[1600px] mx-auto"
      >
        {bookingDrawerOpen && (
          <div
            className="fixed inset-x-0 bottom-0 top-20 z-30 bg-black/40 md:hidden min-[1180px]:hidden"
            aria-hidden
            onClick={() => setBookingDrawerOpen(false)}
          />
        )}

        {!bookingDrawerOpen && (
          <button
            type="button"
            id="court-bookings-drawer-toggle"
            aria-expanded={bookingDrawerOpen}
            aria-controls="court-bookings-sidebar"
            onClick={() => setBookingDrawerOpen(true)}
            className="fixed right-0 z-50 flex h-28 w-9 flex-col items-center justify-center rounded-l-xl border border-r-0 border-slate-200 bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary-hover min-[1180px]:hidden"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
            <span className="sr-only">Show your bookings</span>
          </button>
        )}

        <div className="flex flex-col min-[1180px]:flex-row min-[1180px]:gap-10 items-start">
          <div className="w-full min-w-0 flex-1">
            <LocationCourtBookingWizard
              locationId={locationId}
              areaId={selectedAreaId ?? undefined}
              locationName={location.name}
              locationTimezone={venueTz}
              prefill={prefill}
              onPrefillConsumed={clearPrefill}
              userCourtBookings={myBookings}
            />
          </div>

          <LocationMyBookingsSidebar
            id="court-bookings-sidebar"
            className={cn(
              "max-[1179px]:fixed max-[1179px]:top-20 max-[1179px]:bottom-0 max-[1179px]:right-0 max-[1179px]:z-40 max-[1179px]:w-[min(100vw,380px)] max-[1179px]:max-h-none max-[1179px]:rounded-l-2xl max-[1179px]:rounded-r-none max-[1179px]:border-r-0 max-[1179px]:shadow-xl",
              "max-[1179px]:transition-transform max-[1179px]:duration-300 max-[1179px]:ease-out",
              bookingDrawerOpen
                ? "max-[1179px]:translate-x-0"
                : "max-[1179px]:translate-x-full",
              "min-[1180px]:translate-x-0 min-[1180px]:w-[min(380px,32vw)] min-[1180px]:min-w-[300px] min-[1180px]:shrink-0 min-[1180px]:max-h-[calc(100vh-5rem)] min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:rounded-2xl min-[1180px]:shadow-sm",
            )}
            locationId={locationId}
            displayName={user?.fullName?.split(" ")[0] ?? user?.email ?? "there"}
            bookings={myBookings}
            isLoading={loadingMyBookings}
            onReschedule={handleReschedule}
            showMobileCloseToggle={bookingDrawerOpen}
            onMobileCloseToggle={() => setBookingDrawerOpen(false)}
          />
        </div>
      </motion.div>
    </div>
  );
}
