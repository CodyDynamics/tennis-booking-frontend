"use client";

import { useMemo, useState } from "react";
import { format, parse } from "date-fns";
import { ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";
import { useCancelBooking } from "@/lib/queries";
import type { CourtBooking } from "@/types";
import { cn } from "@/lib/utils";

/** GET /bookings/my rows mapped with `courtName` from joined `court` (see `mapCourtBookingApiToCourtBooking`). */
type SidebarCourtBooking = CourtBooking & { courtName?: string | null };
import { formatTime } from "@/lib/format";
import toast from "react-hot-toast";
import { ApiError } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

function wallShort(t: string) {
  const [h, m] = t.split(":");
  return `${h?.padStart(2, "0")}:${m?.padStart(2, "0")}`;
}

function timeAmPm(t: string) {
  return formatTime(wallShort(t));
}

export function LocationMyBookingsSidebar({
  locationId,
  displayName,
  bookings,
  isLoading,
  onReschedule,
  showMobileCloseToggle = false,
  onMobileCloseToggle,
  id,
  className,
}: {
  locationId: string;
  displayName: string;
  bookings: SidebarCourtBooking[];
  isLoading: boolean;
  onReschedule: (b: SidebarCourtBooking) => void;
  showMobileCloseToggle?: boolean;
  onMobileCloseToggle?: () => void;
  id?: string;
  className?: string;
}) {
  const [active, setActive] = useState<SidebarCourtBooking | null>(null);
  const cancelBooking = useCancelBooking();

  const atLocation = useMemo(() => {
    return bookings
      .filter((b) => b.locationId === locationId && b.bookingStatus !== "cancelled")
      .sort((a, b) => {
        const da = a.bookingDate.localeCompare(b.bookingDate);
        if (da !== 0) return da;
        return wallShort(a.startTime).localeCompare(wallShort(b.startTime)); // sort key 24h
      });
  }, [bookings, locationId]);

  const closeDialog = () => setActive(null);

  const handleCancel = async () => {
    if (!active) return;
    try {
      await cancelBooking.mutateAsync({ kind: "court", id: active.id });
      toast.success("Booking cancelled.");
      closeDialog();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? String(e.body?.message ?? e.message)
          : e instanceof Error
            ? e.message
            : "Could not cancel booking";
      toast.error(msg);
    }
  };

  const handleReschedule = () => {
    if (!active) return;
    const sport = active.sport;
    const courtType = active.courtType;
    if (!sport || !courtType) {
      toast.error("Not enough data to reschedule. Please make a new booking.");
      closeDialog();
      return;
    }
    onReschedule(active);
    closeDialog();
    toast("Pick a new time slot on the left.", { icon: "📅" });
  };

  return (
    <>
      <aside
        id={id}
        className={cn(
          "flex h-full min-h-0 w-full flex-col border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm",
          className,
        )}
      >
        <div
          className={cn(
            "border-b border-slate-100 px-4 py-3 dark:border-slate-800",
            showMobileCloseToggle && "relative pl-14 min-[1180px]:pl-4",
          )}
        >
          {showMobileCloseToggle && onMobileCloseToggle && (
            <button
              type="button"
              aria-expanded
              aria-controls={id}
              onClick={onMobileCloseToggle}
              className="absolute left-3 top-1/2 flex h-11 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-slate-200 bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary-hover min-[1180px]:hidden"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
              <span className="sr-only">Hide your bookings</span>
            </button>
          )}
          <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
            Hi {displayName},
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Your bookings</p>
        </div>

        <div className="scrollbar-app flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
          {isLoading && (
            <GlobalLoadingPlaceholder minHeight="min-h-[200px]" className="rounded-xl" />
          )}
          {!isLoading && atLocation.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No bookings at this venue yet. Book a court on the left — they will show up here.
            </p>
          )}
          <AnimatePresence initial={false}>
            {!isLoading &&
              atLocation.map((b) => (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-900 break-words dark:text-slate-100">
                      {b.courtName?.trim() || "Court"}
                    </p>
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      aria-label="Edit booking"
                      onClick={() => setActive(b)}
                    >
                      <Pencil className="h-3.5 w-3.5 shrink-0" />
                      Edit
                    </button>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded-lg text-left outline-none ring-offset-2 transition-colors hover:bg-slate-100/90 focus-visible:ring-2 focus-visible:ring-primary dark:ring-offset-slate-950 dark:hover:bg-slate-900/70 -mx-1 -mb-1 px-1 pb-1"
                    onClick={() => onReschedule(b)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onReschedule(b);
                      }
                    }}
                  >
                    <p className="text-xs leading-relaxed text-muted-foreground capitalize">
                      {b.sport ?? "Court"} · {b.courtType ?? "—"}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {format(parse(b.bookingDate.slice(0, 10), "yyyy-MM-dd", new Date()), "EEE, MMM d, yyyy")}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
                      {timeAmPm(b.startTime)} – {timeAmPm(b.endTime)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({b.durationMinutes} min)
                      </span>
                    </p>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </aside>

      <Dialog open={!!active} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage booking</DialogTitle>
            <DialogDescription>
              Do you want to cancel this booking or change it to another time?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Close
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleReschedule}
              disabled={!active}
            >
              Change time
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelBooking.isPending}
            >
              {cancelBooking.isPending ? "Cancelling…" : "Cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
