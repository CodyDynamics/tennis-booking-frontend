"use client";

import type { ReactNode } from "react";
import type { CourtBookingWindowAdminApi } from "@/lib/api/endpoints/courts";
import {
  normalizeGridTime,
  sportDisplay,
  toAmPmLabel,
} from "./court-form-shared";

/** Plain lines for calendar headers, tooltips, etc. */
export function formatCourtBookingWindowsAsLines(
  windows: CourtBookingWindowAdminApi[] | undefined,
): string[] {
  if (!windows?.length) return [];
  const sportNorm = (s: string) => (s || "").trim().toLowerCase();
  const normalized = windows.map((w) => ({ ...w, _sp: sportNorm(w.sport) }));
  const perSport = normalized.filter((w) => w._sp && w._sp !== "*" && w._sp !== "all");
  const fmtRange = (a: string, b: string) =>
    `${toAmPmLabel(normalizeGridTime(a))} – ${toAmPmLabel(normalizeGridTime(b))}`;

  if (perSport.length) {
    const bySp = new Map<string, string>();
    for (const w of perSport) {
      if (!bySp.has(w._sp)) bySp.set(w._sp, fmtRange(w.windowStartTime, w.windowEndTime));
    }
    return Array.from(bySp.entries()).map(([sp, range]) => `${sportDisplay(sp)}: ${range}`);
  }

  const star = normalized.filter((w) => !w._sp || w._sp === "*" || w._sp === "all");
  const courtSports = windows[0]?.courtSports?.length ? [...windows[0].courtSports] : [];
  const uniqRanges = new Map<string, string>();
  for (const w of star) {
    const key = `${normalizeGridTime(w.windowStartTime)}|${normalizeGridTime(w.windowEndTime)}`;
    uniqRanges.set(key, fmtRange(w.windowStartTime, w.windowEndTime));
  }
  const ranges = Array.from(uniqRanges.values());
  const names = courtSports.map(sportDisplay).join(", ");
  if (ranges.length === 0) return [];
  if (!names) return ranges;
  if (ranges.length === 1) return [`${names}: ${ranges[0]}`];
  return ranges.map((r) => `${names}: ${r}`);
}

/** Same presentation as the Court Management “Available time” column. */
export function CourtAvailabilityCell({
  windows,
}: {
  windows: CourtBookingWindowAdminApi[] | undefined;
}): ReactNode {
  if (!windows?.length) return "—";
  const sportNorm = (s: string) => (s || "").trim().toLowerCase();
  const normalized = windows.map((w) => ({ ...w, _sp: sportNorm(w.sport) }));
  const perSport = normalized.filter((w) => w._sp && w._sp !== "*" && w._sp !== "all");
  const fmtRange = (a: string, b: string) =>
    `${toAmPmLabel(normalizeGridTime(a))} - ${toAmPmLabel(normalizeGridTime(b))}`;

  if (perSport.length) {
    const bySp = new Map<string, string>();
    for (const w of perSport) {
      if (!bySp.has(w._sp)) bySp.set(w._sp, fmtRange(w.windowStartTime, w.windowEndTime));
    }
    return (
      <ul className="m-0 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
        {Array.from(bySp.entries()).map(([sp, range]) => (
          <li key={sp}>
            <span className="font-medium text-foreground">{sportDisplay(sp)}</span>: {range}
          </li>
        ))}
      </ul>
    );
  }

  const star = normalized.filter((w) => !w._sp || w._sp === "*" || w._sp === "all");
  const courtSports = windows[0]?.courtSports?.length ? [...windows[0].courtSports] : [];
  const uniqRanges = new Map<string, string>();
  for (const w of star) {
    const key = `${normalizeGridTime(w.windowStartTime)}|${normalizeGridTime(w.windowEndTime)}`;
    uniqRanges.set(key, fmtRange(w.windowStartTime, w.windowEndTime));
  }
  const ranges = Array.from(uniqRanges.values());
  const names = courtSports.map(sportDisplay).join(", ");
  if (ranges.length === 0) return "—";
  if (!names) return ranges.join("; ");
  if (ranges.length === 1) {
    return (
      <span className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{names}</span>
        {": "}
        {ranges[0]}
      </span>
    );
  }
  return (
    <div className="space-y-0.5 text-sm text-muted-foreground">
      {ranges.map((r) => (
        <div key={r}>
          <span className="font-medium text-foreground">{names}</span>
          {": "}
          {r}
        </div>
      ))}
    </div>
  );
}
