"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { Activity, BadgeCheck, UserRound } from "lucide-react";

function toTitle(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]?.slice(0, 1).toUpperCase() ?? "U";
  return `${parts[0]?.slice(0, 1) ?? ""}${parts[1]?.slice(0, 1) ?? ""}`.toUpperCase();
}

function statusTone(status: string | null | undefined): string {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "confirmed") return "bg-emerald-100 text-emerald-700";
  if (normalized === "pending") return "bg-amber-100 text-amber-700";
  if (normalized === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function formatTimeRange12(startTime: string, endTime: string): string {
  const base = new Date(2000, 0, 1);
  const [sh, sm] = startTime.slice(0, 5).split(":").map(Number);
  const [eh, em] = endTime.slice(0, 5).split(":").map(Number);
  const a = new Date(base);
  a.setHours(sh, sm ?? 0, 0, 0);
  const b = new Date(base);
  b.setHours(eh, em ?? 0, 0, 0);
  return `${format(a, "h:mm a")} - ${format(b, "h:mm a")}`;
}

function formatBookingDateLabel(bookingDate: string): string {
  const ymdOnly = bookingDate.slice(0, 10);
  return format(parse(ymdOnly, "yyyy-MM-dd", new Date()), "EEE, MMM d, yyyy");
}

function formatSportCourtLine(
  sport: string | null | undefined,
  courtType: string | null | undefined,
): string {
  const raw = (sport?.trim() || "court").replace(/_/g, " ");
  const sportLabel = raw.replace(/\b\w/g, (c) => c.toUpperCase());
  const t = courtType?.toLowerCase();
  const env =
    t === "indoor" || t === "outdoor"
      ? t.charAt(0).toUpperCase() + t.slice(1)
      : courtType?.trim() || "-";
  return `${sportLabel} · ${env}`;
}

export function CourtBookingDetailsCard(props: {
  courtName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  bookingStatus?: string | null;
  sport?: string | null;
  courtType?: string | null;
  ownerLabel?: string;
  ownerName: string;
  topColor?: string;
  badgeBg?: string;
  onEdit?: () => void;
  editLabel?: string;
}) {
  const {
    courtName,
    bookingDate,
    startTime,
    endTime,
    bookingStatus,
    sport,
    courtType,
    ownerLabel = "Owner",
    ownerName,
    topColor = "#0d9488",
    badgeBg = "rgba(255,255,255,0.16)",
    onEdit,
    editLabel = "Edit",
  } = props;

  return (
    <>
      <div
        className="px-4 py-2 text-white"
        style={{
          backgroundColor: topColor,
          borderBottom: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        <div className="flex items-center gap-3">
          <p className="text-xl font-bold leading-none tracking-tight">{courtName}</p>
          <span
            className={cn(
              "rounded-full border border-white/35 px-3 py-1 text-sm font-semibold text-white",
              statusTone(bookingStatus),
            )}
            style={{ backgroundColor: badgeBg }}
          >
            {toTitle(bookingStatus)}
          </span>
        </div>
        <p className="mt-1 text-sm font-bold leading-tight text-white">
          {formatBookingDateLabel(bookingDate)} · {formatTimeRange12(startTime, endTime)}
        </p>
      </div>

      <div className="space-y-3 p-5 text-[14px] text-slate-700 dark:text-slate-200">
        <p className="flex items-center gap-3 font-semibold text-slate-900 dark:text-slate-100">
          <Activity className="h-4 w-4 text-pink-500" />
          {formatSportCourtLine(sport, courtType)}
        </p>
        <p className="flex items-center gap-3">
          <UserRound className="h-4 w-4 text-slate-500" />
          <span className="font-semibold text-slate-600 dark:text-slate-300">{ownerLabel}:</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-slate-800">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-200 text-[11px] font-bold text-indigo-700 dark:bg-indigo-700 dark:text-indigo-100">
              {initials(ownerName)}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{ownerName}</span>
          </span>
        </p>
        <p className="flex items-center gap-3">
          <BadgeCheck className="h-4 w-4 text-slate-500" />
          <span className="font-semibold text-slate-600 dark:text-slate-300">Status:</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {toTitle(bookingStatus)}
          </span>
        </p>
      </div>

      {onEdit ? (
        <div className="px-5 pb-5">
          <Button
            type="button"
            size="sm"
            className="ml-auto rounded-full bg-indigo-500 px-4 hover:bg-indigo-600"
            onClick={onEdit}
          >
            {editLabel}
          </Button>
        </div>
      ) : null}
    </>
  );
}
