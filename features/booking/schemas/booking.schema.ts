import * as z from "zod";

export const bookingSchema = z.object({
  bookingType: z.enum(["COURT_ONLY", "COURT_COACH", "TRAINING"]),
  courtId: z.string().min(1, "Court is required"),
  coachId: z.string().optional(),
  dateRange: z.object({
    from: z.date({ required_error: "Start date is required" }),
    to: z.date({ required_error: "End date is required" }),
  }),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
}).refine((data) => {
  const start = parseInt(data.startTime.split(":")[0]);
  const end = parseInt(data.endTime.split(":")[0]);
  return end > start;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
}).refine((data) => {
  if (data.bookingType === "COURT_COACH" || data.bookingType === "TRAINING") {
    return !!data.coachId;
  }
  return true;
}, {
  message: "Coach is required for this booking type",
  path: ["coachId"],
});

export type BookingFormValues = z.infer<typeof bookingSchema>;
