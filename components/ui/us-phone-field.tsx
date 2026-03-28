"use client";

import PhoneInput from "react-phone-number-input";
import { cn } from "@/lib/utils";

const registerLikeInput =
  "[&_.PhoneInputInput]:flex [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:rounded-md [&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:px-2 [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:ring-0 flex w-full items-center gap-2 rounded-lg border border-input bg-background px-3 shadow-sm ring-offset-background transition-[color,box-shadow] focus-within:ring-2 focus-within:ring-ring";

export type UsPhoneFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** default: h-11 text-base (Register). compact: h-10 text-sm (admin dialogs). */
  variant?: "default" | "compact";
  className?: string;
};

export function UsPhoneField({
  id,
  value,
  onChange,
  disabled,
  variant = "default",
  className,
}: UsPhoneFieldProps) {
  const size =
    variant === "compact"
      ? "[&_.PhoneInputInput]:h-10 [&_.PhoneInputInput]:text-sm h-10 text-sm"
      : "[&_.PhoneInputInput]:h-11 [&_.PhoneInputInput]:text-base h-11 text-base";

  return (
    <PhoneInput
      id={id}
      international={false}
      defaultCountry="US"
      countries={["US"]}
      countryCallingCodeEditable={false}
      limitMaxLength
      placeholder="(555) 555-5555"
      value={value || undefined}
      onChange={(v) => onChange(v ?? "")}
      disabled={disabled}
      className={cn(registerLikeInput, size, className)}
    />
  );
}
