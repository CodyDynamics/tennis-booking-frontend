import * as z from "zod";
import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js";

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone is required"),
    street: z.string().min(1, "Street is required").max(200),
    city: z.string().min(1, "City is required").max(100),
    state: z.string().min(1, "State is required").max(50),
    zipCode: z
      .string()
      .min(1, "ZIP code is required")
      .regex(
        /^\d{5}(-\d{4})?$/,
        "Use 5 digits or ZIP+4 (e.g. 78701 or 78701-1234)",
      ),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    if (!data.phone?.trim()) return;
    if (!isValidPhoneNumber(data.phone, "US")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid US phone number",
        path: ["phone"],
      });
      return;
    }
    const parsed = parsePhoneNumberFromString(data.phone, "US");
    const national = parsed?.nationalNumber ?? "";
    if (national.length !== 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "US numbers must be 10 digits",
        path: ["phone"],
      });
    }
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
