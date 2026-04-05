"use client";

import { useMemo, useState } from "react";
import { format, parse } from "date-fns";
import { Pencil } from "lucide-react";
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
  id,
  className,
}: {
  locationId: string;
  displayName: string;
  bookings: SidebarCourtBooking[];
  isLoading: boolean;
  onReschedule: (b: SidebarCourtBooking) => void;
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
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
            Hi {displayName},
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Your bookings</p>
        </div>

        <div className="scrollbar-app flex-1 overflow-y-auto p-3 space-y-2.5">
          {isLoading && (
            <GlobalLoadingPlaceholder minHeight="min-h-[200px]" className="rounded-xl" />
          )}
          {!isLoading && atLocation.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8 px-2">
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
                  className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/40 p-3"
                >
                  <button
                    type="button"
                    className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Edit booking"
                    onClick={() => setActive(b)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <div
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer text-left rounded-lg pr-[4.5rem] outline-none transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-900/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 -m-1 p-1"
                    onClick={() => onReschedule(b)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onReschedule(b);
                      }
                    }}
                  >
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {b.courtName?.trim() || "Court"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {b.sport ?? "Court"} · {b.courtType ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parse(b.bookingDate.slice(0, 10), "yyyy-MM-dd", new Date()), "EEE, MMM d, yyyy")}
                    </p>
                    <p className="text-xs font-medium mt-1.5">
                      {timeAmPm(b.startTime)} – {timeAmPm(b.endTime)}{" "}
                      <span className="text-muted-foreground font-normal">({b.durationMinutes} min)</span>
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
