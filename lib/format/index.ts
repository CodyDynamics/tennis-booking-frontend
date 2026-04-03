/**
 * Formatting utilities for display: money, dates, numbers.
 */

/** Format a number as currency (no symbol, with thousands separators). */
function formatNumber(n: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale).format(n);
}

/**
 * Format amount as money with optional symbol and decimals.
 * @param amount - Numeric amount
 * @param options - symbol (default "$"), decimals (default 0), locale
 */
export function formatMoney(
  amount: number,
  options: { symbol?: string; decimals?: number; locale?: string } = {},
): string {
  const { symbol = "$", decimals = 0, locale = "en-US" } = options;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `${symbol}${formatted}`;
}

/**
 * Format amount as money with thousands separators (e.g. $200,000).
 * Same as formatMoney with default decimals 0.
 */
export function formatCurrency(amount: number, symbol = "$"): string {
  return formatMoney(amount, { symbol });
}

/**
 * Format a date for display.
 * @param date - Date instance or ISO date string
 * @param pattern - "short" (MMM d, yyyy), "long" (EEEE, MMMM d, yyyy), "date" (yyyy-MM-dd), or custom format (date-fns style)
 */
export function formatDate(
  date: Date | string,
  pattern: "short" | "long" | "date" | string = "short",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";

  const locale = "en-US";
  switch (pattern) {
    case "short":
      return d.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    case "long":
      return d.toLocaleDateString(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    case "date":
      return d.toISOString().slice(0, 10);
    default:
      return d.toLocaleDateString(locale);
  }
}

/**
 * Format a time string (HH:mm or HH:mm:ss) for display (e.g. "14:30" -> "2:30 PM").
 */
export function formatTime(time: string, use24h = false): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, h, m ?? 0);
  if (use24h) {
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * Format date and time together.
 */
export function formatDateTime(date: Date | string, time?: string): string {
  const dateStr = formatDate(date, "short");
  if (time) return `${dateStr} ${formatTime(time)}`;
  return dateStr;
}

/**
 * Format a number with optional decimals and locale.
 */
export function formatNumberDisplay(
  value: number,
  options: { decimals?: number; locale?: string } = {},
): string {
  const { decimals = 0, locale = "en-US" } = options;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export { formatNumber };

/**
 * Title-case filter / enum labels (e.g. "super_user" → "Super User", "pending" → "Pending").
 */
export function titleCaseFilterLabel(raw: string): string {
  if (!raw?.trim()) return raw;
  return raw
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
