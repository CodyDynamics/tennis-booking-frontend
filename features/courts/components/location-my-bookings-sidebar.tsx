"use client";

import { useMemo, useState } from "react";
import { format, parse } from "date-fns";
import { X } from "lucide-react";
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
import toast from "react-hot-toast";
import { ApiError } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

function wallShort(t: string) {
  const [h, m] = t.split(":");
  return `${h?.padStart(2, "0")}:${m?.padStart(2, "0")}`;
}

export function LocationMyBookingsSidebar({
  locationId,
  displayName,
  bookings,
  isLoading,
  onReschedule,
}: {
  locationId: string;
  displayName: string;
  bookings: CourtBooking[];
  isLoading: boolean;
  onReschedule: (b: CourtBooking) => void;
}) {
  const [active, setActive] = useState<CourtBooking | null>(null);
  const cancelBooking = useCancelBooking();

  const atLocation = useMemo(() => {
    return bookings
      .filter((b) => b.locationId === locationId && b.bookingStatus !== "cancelled")
      .sort((a, b) => {
        const da = a.bookingDate.localeCompare(b.bookingDate);
        if (da !== 0) return da;
        return wallShort(a.startTime).localeCompare(wallShort(b.startTime));
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
        className={cn(
          "flex flex-col border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm",
          "w-full lg:w-[380px] lg:min-w-[320px] shrink-0 lg:max-h-[calc(100vh-8rem)] lg:sticky lg:top-24",
        )}
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
            Hi {displayName},
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Your bookings</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                  className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/40 p-4 pr-10"
                >
                  <button
                    type="button"
                    className="absolute top-2 right-2 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-foreground transition-colors"
                    aria-label="Cancel or reschedule"
                    onClick={() => setActive(b)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="font-semibold text-sm capitalize text-slate-900 dark:text-slate-100">
                    {b.sport ?? "Court"} · {b.courtType ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parse(b.bookingDate.slice(0, 10), "yyyy-MM-dd", new Date()), "EEE, MMM d, yyyy")}
                  </p>
                  <p className="text-sm font-medium mt-2">
                    {wallShort(b.startTime)} – {wallShort(b.endTime)}{" "}
                    <span className="text-muted-foreground font-normal">({b.durationMinutes} min)</span>
                  </p>
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
