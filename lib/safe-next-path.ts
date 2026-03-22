/**
 * Prevent open redirects: only allow same-origin relative paths.
 */
export function safeNextPath(next: string | null | undefined): string | undefined {
  if (next == null || typeof next !== "string") return undefined;
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return undefined;
  return t;
}
