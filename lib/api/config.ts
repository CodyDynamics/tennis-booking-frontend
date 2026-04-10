/**
 * API base URL. Use env in browser so it can be overridden in deployment.
 */
const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
};

export const API_BASE_URL = getBaseUrl();

/**
 * Origin for Socket.IO (no /api suffix). REST clients often set NEXT_PUBLIC_API_URL to …/api;
 * io(`${that}/holds`) would otherwise use namespace /api/holds while the gateway is on /holds.
 */
export function getSocketIoOrigin(): string {
  return getBaseUrl().replace(/\/api\/?$/, "");
}
