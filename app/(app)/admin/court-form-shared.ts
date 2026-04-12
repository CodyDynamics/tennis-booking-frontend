/** Shared constants and pure helpers for Court Management form + AdminCourtFormDialog. */

export const SPORT_OPTIONS = [
  { code: "tennis", label: "Tennis" },
  { code: "pickleball", label: "Pickleball" },
  { code: "ball-machine", label: "Ball Machine" },
] as const;

export const ENV_OPTIONS = ["outdoor", "indoor"] as const;

export const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export function toAmPmLabel(hhmm: string): string {
  const [hStr, m] = hhmm.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

export function normalizeGridTime(t: string): string {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "08:00";
  let h = parseInt(m[1], 10);
  if (h > 23) h = 23;
  const mm = m[2] === "30" ? "30" : "00";
  return `${String(h).padStart(2, "0")}:${mm}`;
}

export function toggleSport(current: string[], code: string): string[] {
  if (current.includes(code)) {
    const next = current.filter((s) => s !== code);
    return next.length ? next : current;
  }
  return [...current, code];
}

export function toggleEnv(
  current: ("indoor" | "outdoor")[],
  code: "indoor" | "outdoor",
): ("indoor" | "outdoor")[] {
  if (current.includes(code)) {
    const next = current.filter((s) => s !== code);
    return next.length ? next : current;
  }
  return [...current, code];
}

export function sportDisplay(code: string): string {
  const c = code.trim().toLowerCase();
  if (c === "ball-machine") return "Ball Machine";
  if (c === "tennis") return "Tennis";
  if (c === "pickleball") return "Pickleball";
  if (!c) return code;
  return c
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function defaultCourtFormLocation(
  adminLocationId: string,
  locations: { id: string; name: string }[],
): string {
  if (adminLocationId !== "all") return adminLocationId;
  const sp = locations.find((l) => /springpark/i.test(l.name.trim()));
  return sp?.id ?? locations[0]?.id ?? "";
}

export type PerSportRow = { sport: string; windowStartTime: string; windowEndTime: string };

function hhmmToMinutes(hhmm: string): number {
  const n = normalizeGridTime(hhmm);
  const [h, m] = n.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Half-open [start, end): adjacent windows (end A === start B) do not overlap. */
function windowsOverlapHalfOpen(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const sa = hhmmToMinutes(startA);
  const ea = hhmmToMinutes(endA);
  const sb = hhmmToMinutes(startB);
  const eb = hhmmToMinutes(endB);
  if (ea <= sa || eb <= sb) return false;
  return sa < eb && sb < ea;
}

/** Inline issue per row (order matches `rows`). */
export function perSportRowIssues(rows: PerSportRow[]): (string | null)[] {
  const issues: (string | null)[] = rows.map(() => null);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const si = normalizeGridTime(r.windowStartTime);
    const ei = normalizeGridTime(r.windowEndTime);
    if (hhmmToMinutes(ei) <= hhmmToMinutes(si)) {
      issues[i] = "End time must be after start.";
      continue;
    }
    for (let j = 0; j < rows.length; j++) {
      if (i === j) continue;
      const o = rows[j];
      const sj = normalizeGridTime(o.windowStartTime);
      const ej = normalizeGridTime(o.windowEndTime);
      if (hhmmToMinutes(ej) <= hhmmToMinutes(sj)) continue;
      if (windowsOverlapHalfOpen(si, ei, sj, ej)) {
        issues[i] = `Overlaps with ${sportDisplay(o.sport)} (${toAmPmLabel(sj)} – ${toAmPmLabel(ej)}).`;
        break;
      }
    }
  }
  return issues;
}
