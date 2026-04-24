/**
 * Persists the short-lived JWT in sessionStorage and sends it as Authorization: Bearer
 * (see `lib/api/client.ts`). The API also sets httpOnly cookies; in cross-site
 * environments (e.g. SPA on a different host than the API) some browsers do not
 * store or send third-party cookies reliably — the bearer token from JSON keeps
 * auth working while refresh still uses credentials: "include" for the refresh cookie
 * when the browser allows it.
 */
const ACCESS_TOKEN_KEY = "bt_access_jwt";

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    else sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // private mode / disabled storage
  }
}
