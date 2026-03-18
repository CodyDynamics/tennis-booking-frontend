import * as z from "zod";

export const requestOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
});

export type RequestOtpFormValues = z.infer<typeof requestOtpSchema>;
