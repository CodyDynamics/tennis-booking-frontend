"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { ApiError } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingTypeSelector } from "@/features/booking/components/booking-type-selector";
import { useCreateCourtBooking } from "@/lib/queries";
import { useCoaches } from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { useBookingCalculations } from "@/features/booking/hooks/use-booking-calculations";
import { bookingSchema } from "@/features/booking/schemas/booking.schema";
import type { BookingFormValues } from "@/features/booking/schemas/booking.schema";
import type { Court } from "@/types";
import { formatCurrency } from "@/lib/format";
import { format, eachDayOfInterval } from "date-fns";
import { useRouter } from "next/navigation";
import { Clock, CalendarDays } from "lucide-react";

interface CourtBookingModalProps {
  court: Court | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DURATIONS = [30, 60, 90] as const;
type Duration = typeof DURATIONS[number];

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function CourtBookingModal({
  court,
  open,
  onOpenChange,
}: CourtBookingModalProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  
  const [bookingType, setBookingType] = useState<"COURT_ONLY" | "COURT_COACH" | "TRAINING">("COURT_ONLY");
  const [selectedCoachId, setSelectedCoachId] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // New states for dynamic time slots
  const [selectedMainSlot, setSelectedMainSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [duration, setDuration] = useState<Duration>(60);
  const [selectedBlock, setSelectedBlock] = useState<{ start: string; end: string } | null>(null);
  const [bookedBlocksInfo, setBookedBlocksInfo] = useState<Record<string, boolean>>({});

  const { user } = useAuth();
  const createBooking = useCreateCourtBooking();
  const { data: coaches } = useCoaches();
  const router = useRouter();

  const defaultSlots = [
    { startTime: "08:00", endTime: "10:30" },
    { startTime: "14:00", endTime: "15:30" },
    { startTime: "19:00", endTime: "20:30" },
  ];
  const timeSlots = court?.timeSlots?.length ? court.timeSlots : defaultSlots;
  const selectedCoach = coaches?.find((c) => c.id === selectedCoachId);

  const {
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    mode: "onSubmit",
    defaultValues: {
      bookingType: "COURT_ONLY",
      courtId: "",
    },
  });

  useEffect(() => {
    if (court) {
      try {
        const stored = localStorage.getItem(`booked_${court.id}`);
        if (stored) {
          setBookedBlocksInfo(JSON.parse(stored));
        }
      } catch (e) {}
    }
  }, [court]);

  useEffect(() => {
    if (open && court) {
      setValue("courtId", court.id);
    }
  }, [open, court, setValue]);

  useEffect(() => {
    if (selectedBlock) {
      setValue("startTime", selectedBlock.start);
      setValue("endTime", selectedBlock.end);
    }
  }, [selectedBlock, setValue]);

  const priceBreakdown = useBookingCalculations(
    court ?? null,
    selectedCoach || null,
    dateRange,
    selectedBlock?.start,
    selectedBlock?.end,
    bookingType,
  );

  const onSubmit = async (data: BookingFormValues) => {
    if (!court || !user || !data.dateRange.from || !data.dateRange.to || !selectedBlock) return;

    const durationMinutes = timeToMinutes(selectedBlock.end) - timeToMinutes(selectedBlock.start);

    setSubmitError(null);
    try {
      const dates = eachDayOfInterval({
        start: data.dateRange.from,
        end: data.dateRange.to,
      });

      for (const date of dates) {
        await createBooking.mutateAsync({
          userId: user.id,
          courtId: court.id,
          coachId: data.coachId || null,
          bookingType: data.bookingType,
          bookingDate: format(date, "yyyy-MM-dd"),
          startTime: selectedBlock.start,
          endTime: selectedBlock.end,
          durationMinutes,
          totalPrice: priceBreakdown?.total || 0,
        });
      }

      // Mock disabling functionality by saving booked block in localStorage
      const newBooked = { ...bookedBlocksInfo };
      for (const date of dates) {
         const dateStr = format(date, "yyyy-MM-dd");
         newBooked[`${dateStr}_${selectedBlock.start}_${selectedBlock.end}`] = true;
      }
      localStorage.setItem(`booked_${court.id}`, JSON.stringify(newBooked));
      setBookedBlocksInfo(newBooked);

      reset();
      setDateRange({ from: undefined, to: undefined });
      setSelectedMainSlot(null);
      setSelectedBlock(null);
      setBookingType("COURT_ONLY");
      setSelectedCoachId("");
      setSubmitError(null);
      onOpenChange(false);
      router.push("/booking-history");
    } catch (error) {
       setSubmitError("Booking failed. Please try again.");
    }
  };

  const generatedBlocks = useMemo(() => {
    if (!selectedMainSlot) return [];
    const blocks: { start: string; end: string; booked: boolean }[] = [];
    let startMins = timeToMinutes(selectedMainSlot.startTime);
    const endSlotMins = timeToMinutes(selectedMainSlot.endTime);
    
    while (startMins + duration <= endSlotMins) {
      const endMins = startMins + duration;
      const startStr = minutesToTime(startMins);
      const endStr = minutesToTime(endMins);
      
      // Check if this block intersects with any booked block for the selected dates
      let isBooked = false;
      if (dateRange.from && dateRange.to) {
        const dates = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
        for (const date of dates) {
           const dStr = format(date, "yyyy-MM-dd");
           const key = `${dStr}_${startStr}_${endStr}`;
           if (bookedBlocksInfo[key]) {
              isBooked = true;
              break;
           }
        }
      }

      blocks.push({ start: startStr, end: endStr, booked: isBooked });
      startMins += duration; // or adjust step to allow overlapping choices, e.g. startMins += 30
    }
    return blocks;
  }, [selectedMainSlot, duration, bookedBlocksInfo, dateRange]);

  const handleRangeSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    if (range.from && range.to) {
      setValue("dateRange", { from: range.from, to: range.to });
    }
    setSelectedBlock(null);
  };

  if (!open || !court) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
        <div className="bg-primary p-6 text-primary-foreground rounded-t-2xl">
           <DialogTitle className="text-3xl font-bold flex items-center gap-2">
             Book {court.name}
           </DialogTitle>
           <DialogDescription className="text-primary-foreground/85 mt-2 text-md">
             {court.type === "indoor" ? "Indoor" : "Outdoor"} facility • {formatCurrency(Number(court.pricePerHour))}/hour
           </DialogDescription>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
          <BookingTypeSelector value={bookingType} onChange={(v) => { setBookingType(v); setValue("bookingType", v); }} />

          {(bookingType === "COURT_COACH" || bookingType === "TRAINING") && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Label className="text-base font-semibold mb-3 block">Select Professional Coach</Label>
              <Select value={selectedCoachId} onValueChange={(id) => { setSelectedCoachId(id); setValue("coachId", id); }}>
                <SelectTrigger className="h-12 border-slate-200">
                  <SelectValue placeholder="Choose a coach for your session" />
                </SelectTrigger>
                <SelectContent>
                  {coaches?.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.user?.fullName || `Coach ${coach.id}`} - {formatCurrency(Number(coach.hourlyRate))}/hr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <Label className="text-base font-semibold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Select Date</Label>
               <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                 <DateRangePicker selectedRange={dateRange} onSelectRange={handleRangeSelect} minDate={new Date()} />
               </div>
            </div>
            
            <AnimatePresence>
              {dateRange.from && dateRange.to && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  
                  <div className="space-y-3">
                    <Label className="text-base font-semibold flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Choose Time Slot</Label>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {timeSlots.map((slot, i) => {
                        const isSelected = selectedMainSlot?.startTime === slot.startTime;
                        return (
                          <Button
                            key={i}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className={`h-auto py-3 ${isSelected ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1" : "hover:bg-muted"}`}
                            onClick={() => { setSelectedMainSlot(slot); setSelectedBlock(null); }}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{slot.startTime}</span>
                              <span className="text-xs opacity-80">to {slot.endTime}</span>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedMainSlot && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-4 border-t border-slate-100">
                      <Label className="text-base font-semibold">Select Duration</Label>
                      <div className="flex gap-3">
                        {DURATIONS.map(d => (
                          <Button
                            key={d}
                            type="button"
                            variant={duration === d ? "default" : "secondary"}
                            onClick={() => { setDuration(d); setSelectedBlock(null); }}
                            className="flex-1 rounded-full font-semibold"
                          >
                            {d} Mins
                          </Button>
                        ))}
                      </div>

                      <div className="pt-2">
                        <Label className="text-sm text-muted-foreground mb-2 block">Available specific times:</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {generatedBlocks.map((block, i) => {
                            const isSelected = selectedBlock?.start === block.start;
                            return (
                               <Button
                                 key={i}
                                 type="button"
                                 disabled={block.booked}
                                 variant={isSelected ? "default" : "outline"}
                                 className={isSelected ? 'bg-green-600 hover:bg-green-700 text-white border-transparent' : (block.booked ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'hover:border-green-500')}
                                 onClick={() => setSelectedBlock(block)}
                               >
                                 {block.start} - {block.end}
                                 {block.booked && <span className="ml-2 text-xs">(Booked)</span>}
                               </Button>
                            );
                          })}
                          {generatedBlocks.length === 0 && (
                             <p className="text-sm text-primary col-span-2 py-2">
                               Duration is too long for the selected slot. Try a shorter duration.
                             </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {submitError && <p className="text-sm text-destructive font-medium bg-red-50 p-3 rounded-lg">{submitError}</p>}
          
          {selectedBlock && priceBreakdown && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 bg-slate-900 text-white rounded-xl shadow-inner mt-8">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-semibold text-primary-foreground/90">Booking Summary</h4>
                  <p className="text-slate-300 mt-1">
                    {dateRange.from && format(dateRange.from, "MMM dd")} 
                    {dateRange.to && dateRange.from?.getTime() !== dateRange.to?.getTime() && ` - ${format(dateRange.to, "MMM dd")}`}
                  </p>
                  <p className="text-slate-300 font-medium text-lg mt-1 block">
                    {selectedBlock.start} to {selectedBlock.end} ({duration} mins)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Total Price</p>
                  <p className="text-4xl font-black text-white">{formatCurrency(priceBreakdown.total)}</p>
                </div>
              </div>
            </motion.div>
          )}

          <DialogFooter className="pt-6 border-t mt-8 gap-3 sm:gap-0">
            <Button type="button" variant="ghost" className="text-slate-500" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              type="submit" 
              className="bg-primary hover:opacity-90 text-primary-foreground px-8 py-6 text-lg rounded-full shadow-brand transition-all"
              disabled={!selectedBlock || createBooking.isPending}
            >
              {createBooking.isPending ? "Confirming..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
