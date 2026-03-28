import { isPossiblePhoneNumber } from "react-phone-number-input";

export function normalizePhoneDigits(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function isValidUsPhone(raw: string): boolean {
  return !!raw && isPossiblePhoneNumber(raw);
}

export function formatAsUsPhone(raw: string): string {
  const digits = normalizePhoneDigits(raw);
  const tenDigits =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (tenDigits.length !== 10) return raw;
  return `+1 (${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
}

/** Table / list display: (XXX) XXX-XXXX when 10 US digits; otherwise raw. */
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (value == null || !String(value).trim()) return "—";
  const t = String(value).trim();
  const digits = normalizePhoneDigits(t);
  const tenDigits =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (tenDigits.length === 10) {
    return `(${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
  }
  return t;
}
