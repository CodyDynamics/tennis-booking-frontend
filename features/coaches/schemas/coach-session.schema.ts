import * as z from "zod";

export const coachSessionSchema = z.object({
  dateRange: z.object({
    from: z.date({ required_error: "Start date is required" }),
    to: z.date({ required_error: "End date is required" }),
  }),
  startTime: z.string().min(1, "Start time is required"),
  duration: z.string().min(1, "Duration is required"),
  sessionType: z.enum(["private", "group"]),
});

export type CoachSessionFormValues = z.infer<typeof coachSessionSchema>;
