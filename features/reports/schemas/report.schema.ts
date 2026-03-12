import * as z from "zod";

export const reportSchema = z.object({
  forehandScore: z.number().min(1).max(10),
  backhandScore: z.number().min(1).max(10),
  serveScore: z.number().min(1).max(10),
  footworkScore: z.number().min(1).max(10),
  staminaScore: z.number().min(1).max(10),
  attendance: z.boolean(),
  overallComment: z.string().optional(),
  improvementPlan: z.string().optional(),
  nextGoal: z.string().optional(),
});

export type ReportFormValues = z.infer<typeof reportSchema>;
