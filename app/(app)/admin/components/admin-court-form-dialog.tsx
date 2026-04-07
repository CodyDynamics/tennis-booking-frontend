"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useCreateCourt,
  useCourtBookingWindows,
  useUpdateCourt,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Court } from "@/types";
import type { CourtBookingWindowAdminApi } from "@/lib/api/endpoints/courts";
import {
  defaultCourtFormLocation,
  ENV_OPTIONS,
  normalizeGridTime,
  perSportRowIssues,
  type PerSportRow,
  SPORT_OPTIONS,
  TIME_OPTIONS,
  toAmPmLabel,
  toggleEnv,
  toggleSport,
} from "../court-form-shared";

export type AdminCourtFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = create mode */
  editingCourt: Court | null;
  locations: { id: string; name: string }[];
  /** `useAdmin().locationId` */
  adminScopedLocationId: string;
};

export function AdminCourtFormDialog({
  open,
  onOpenChange,
  editingCourt,
  locations,
  adminScopedLocationId,
}: AdminCourtFormDialogProps) {
  const editingId = editingCourt?.id ?? null;

  const [courtFormLocationId, setCourtFormLocationId] = useState("");
  const [name, setName] = useState("");
  const [selectedCourtTypes, setSelectedCourtTypes] = useState<("indoor" | "outdoor")[]>([
    "outdoor",
  ]);
  const [selectedSports, setSelectedSports] = useState<string[]>(["tennis"]);
  const [courtStatus, setCourtStatus] = useState<"active" | "maintenance">("active");
  const [scheduleMode, setScheduleMode] = useState<"shared" | "per_sport">("shared");
  const [windowStartTime, setWindowStartTime] = useState("08:00");
  const [windowEndTime, setWindowEndTime] = useState("11:00");
  const [perSportRows, setPerSportRows] = useState<PerSportRow[]>([
    { sport: "tennis", windowStartTime: "08:00", windowEndTime: "11:00" },
  ]);
  const [description, setDescription] = useState("");
  const [formScheduleError, setFormScheduleError] = useState<string | null>(null);

  const { data: bookingWindows = [] } = useCourtBookingWindows({});

  const windowsByCourtId = useMemo(() => {
    const m = new Map<string, CourtBookingWindowAdminApi[]>();
    for (const w of bookingWindows) {
      const arr = m.get(w.courtId) ?? [];
      arr.push(w);
      m.set(w.courtId, arr);
    }
    return m;
  }, [bookingWindows]);

  const createCourt = useCreateCourt();
  const updateCourt = useUpdateCourt();

  const resetForm = useCallback(() => {
    setCourtFormLocationId(defaultCourtFormLocation(adminScopedLocationId, locations));
    setName("");
    setSelectedCourtTypes(["outdoor"]);
    setSelectedSports(["tennis"]);
    setCourtStatus("active");
    setScheduleMode("shared");
    setWindowStartTime("08:00");
    setWindowEndTime("11:00");
    setPerSportRows([{ sport: "tennis", windowStartTime: "08:00", windowEndTime: "11:00" }]);
    setDescription("");
    setFormScheduleError(null);
  }, [adminScopedLocationId, locations]);

  useEffect(() => {
    if (!open || editingCourt) return;
    resetForm();
    setCourtFormLocationId(defaultCourtFormLocation(adminScopedLocationId, locations));
  }, [open, editingCourt, adminScopedLocationId, locations, resetForm]);

  useEffect(() => {
    if (!open || !editingCourt) return;

    const c = editingCourt;
    setCourtFormLocationId(c.locationId ?? "");
    setName(c.name);
    setSelectedCourtTypes(c.courtTypes?.length ? [...c.courtTypes] : [c.type]);
    setSelectedSports(c.sports?.length ? [...c.sports] : [c.sport]);
    setCourtStatus(c.status as "active" | "maintenance");
    setDescription(c.description ?? "");
    setFormScheduleError(null);

    const wins = windowsByCourtId.get(c.id) ?? [];
    const sportNorm = (s: string) => (s || "").trim().toLowerCase();
    const perSportWins = wins.filter((w) => {
      const sp = sportNorm(w.sport);
      return sp && sp !== "*" && sp !== "all";
    });

    if (perSportWins.length) {
      setScheduleMode("per_sport");
      const bySport = new Map<string, PerSportRow>();
      for (const w of perSportWins) {
        const sp = sportNorm(w.sport);
        if (!bySport.has(sp)) {
          bySport.set(sp, {
            sport: sp,
            windowStartTime: normalizeGridTime(w.windowStartTime),
            windowEndTime: normalizeGridTime(w.windowEndTime),
          });
        }
      }
      setPerSportRows(Array.from(bySport.values()));
      setWindowStartTime("08:00");
      setWindowEndTime("11:00");
    } else {
      setScheduleMode("shared");
      const first = wins[0];
      if (first) {
        setWindowStartTime(normalizeGridTime(first.windowStartTime));
        setWindowEndTime(normalizeGridTime(first.windowEndTime));
      } else {
        setWindowStartTime("08:00");
        setWindowEndTime("11:00");
      }
      setPerSportRows([
        {
          sport: (c.sports?.[0] ?? c.sport ?? "tennis").toLowerCase(),
          windowStartTime: first ? normalizeGridTime(first.windowStartTime) : "08:00",
          windowEndTime: first ? normalizeGridTime(first.windowEndTime) : "11:00",
        },
      ]);
    }
  }, [open, editingCourt, windowsByCourtId]);

  const addPerSportRow = () => {
    setPerSportRows((rows) => {
      const used = new Set(rows.map((r) => r.sport));
      const nextSport =
        SPORT_OPTIONS.map((o) => o.code).find((code) => !used.has(code)) ?? "tennis";
      return [...rows, { sport: nextSport, windowStartTime: "08:00", windowEndTime: "11:00" }];
    });
  };

  const perSportIssues = useMemo(
    () => (scheduleMode === "per_sport" ? perSportRowIssues(perSportRows) : []),
    [scheduleMode, perSportRows],
  );
  const perSportHasBlockingIssue = perSportIssues.some(Boolean);

  const validateSchedule = (): string | null => {
    if (scheduleMode === "shared") {
      if (windowEndTime <= windowStartTime) return "Window end must be after start.";
      if (!selectedSports.length) return "Select at least one activity.";
      return null;
    }
    if (perSportHasBlockingIssue) return null;
    const codes = new Set(perSportRows.map((r) => r.sport));
    if (codes.size !== perSportRows.length) return "Each sport can only appear once.";
    return null;
  };

  const buildBody = () => {
    const loc = courtFormLocationId || locations[0]?.id;
    if (!loc || !name.trim()) return null;
    const courtTypes =
      selectedCourtTypes.length > 0 ? selectedCourtTypes : (["outdoor"] as ("indoor" | "outdoor")[]);
    if (scheduleMode === "per_sport" && perSportHasBlockingIssue) return null;
    const err = validateSchedule();
    if (err) return null;

    const sportsUnion =
      scheduleMode === "per_sport"
        ? Array.from(new Set(perSportRows.map((r) => r.sport)))
        : selectedSports.length
          ? selectedSports
          : ["tennis"];

    const base = {
      locationId: loc,
      name: name.trim(),
      courtTypes,
      sports: sportsUnion,
      status: courtStatus,
      description: description.trim() || undefined,
    };

    if (scheduleMode === "per_sport") {
      return {
        ...base,
        courtScheduleMode: "per_sport" as const,
        perSportWindows: perSportRows.map((r) => ({
          sport: r.sport,
          windowStartTime: r.windowStartTime,
          windowEndTime: r.windowEndTime,
        })),
      };
    }
    return {
      ...base,
      courtScheduleMode: "shared" as const,
      windowStartTime,
      windowEndTime,
    };
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetForm();
      }}
    >
      <DialogContent className="flex max-h-[85vh] w-[min(100vw-2rem,48rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogHeader className="shrink-0 space-y-1.5 px-6 pb-2 pt-6 pr-14 text-left">
          <DialogTitle>{editingId ? "Edit court" : "Create court"}</DialogTitle>
        </DialogHeader>
        <div className="scrollbar-app min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-1">
          <div>
            <Label>Location</Label>
            <Select
              value={courtFormLocationId || locations[0]?.id}
              onValueChange={setCourtFormLocationId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="max-w-[220px]">
            <Label>Court number</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Court 1"
              className="max-w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Venue type</Label>
            <p className="text-xs text-muted-foreground">
              Indoor and/or outdoor if the same court is used in more than one setting. Booking hours
              below apply to each selected type.
            </p>
            <div className="flex flex-wrap gap-2">
              {ENV_OPTIONS.map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={selectedCourtTypes.includes(t) ? "default" : "outline"}
                  size="sm"
                  className="capitalize"
                  onClick={() => setSelectedCourtTypes((prev) => toggleEnv(prev, t))}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Booking hours</Label>
            <RadioGroup
              value={scheduleMode}
              onValueChange={(v) => {
                setScheduleMode(v as "shared" | "per_sport");
                setFormScheduleError(null);
              }}
              className="space-y-4"
            >
              <div className="flex items-start gap-2 rounded-lg border p-3">
                <RadioGroupItem value="per_sport" id="sched-per-dialog" className="mt-1" />
                <div className="min-w-0 flex-1 space-y-3">
                  <Label htmlFor="sched-per-dialog" className="cursor-pointer font-medium leading-none">
                    Option 1: Multiple time slots for Activity
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Set start and end for each activity. Time ranges must not overlap between sports
                    (one may end when another starts). Use + to add another sport row.
                  </p>
                  {scheduleMode === "per_sport" && (
                    <div className="space-y-3">
                      {perSportRows.map((row, idx) => {
                        const rowIssue = perSportIssues[idx] ?? null;
                        return (
                          <div
                            key={`${row.sport}-${idx}`}
                            className="border-b border-dashed pb-3 last:border-0 last:pb-0"
                          >
                            <div className="overflow-x-auto pb-0.5">
                              <div className="flex min-w-0 flex-nowrap items-end gap-2">
                                <div className="w-[140px] shrink-0">
                                  <Label className="text-xs">Sport</Label>
                                  <Select
                                    value={row.sport}
                                    onValueChange={(v) => {
                                      setFormScheduleError(null);
                                      setPerSportRows((rows) =>
                                        rows.map((r, i) => (i === idx ? { ...r, sport: v } : r)),
                                      );
                                    }}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {SPORT_OPTIONS.map(({ code, label }) => (
                                        <SelectItem key={code} value={code}>
                                          {label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="w-[132px] shrink-0">
                                  <Label className="text-xs">Start</Label>
                                  <Select
                                    value={row.windowStartTime}
                                    onValueChange={(v) => {
                                      setFormScheduleError(null);
                                      setPerSportRows((rows) =>
                                        rows.map((r, i) =>
                                          i === idx ? { ...r, windowStartTime: v } : r,
                                        ),
                                      );
                                    }}
                                  >
                                    <SelectTrigger
                                      className={cn(
                                        "h-9",
                                        rowIssue &&
                                          "border-destructive ring-1 ring-destructive/30 focus:ring-destructive/40",
                                      )}
                                      aria-invalid={rowIssue ? true : undefined}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72">
                                      {TIME_OPTIONS.map((t) => (
                                        <SelectItem key={t} value={t}>
                                          {toAmPmLabel(t)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="w-[132px] shrink-0">
                                  <Label className="text-xs">End</Label>
                                  <Select
                                    value={row.windowEndTime}
                                    onValueChange={(v) => {
                                      setFormScheduleError(null);
                                      setPerSportRows((rows) =>
                                        rows.map((r, i) =>
                                          i === idx ? { ...r, windowEndTime: v } : r,
                                        ),
                                      );
                                    }}
                                  >
                                    <SelectTrigger
                                      className={cn(
                                        "h-9",
                                        rowIssue &&
                                          "border-destructive ring-1 ring-destructive/30 focus:ring-destructive/40",
                                      )}
                                      aria-invalid={rowIssue ? true : undefined}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72">
                                      {TIME_OPTIONS.map((t) => (
                                        <SelectItem key={t} value={t}>
                                          {toAmPmLabel(t)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {perSportRows.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="mb-0.5 h-9 w-9 shrink-0 text-muted-foreground"
                                    aria-label="Remove row"
                                    onClick={() => {
                                      setFormScheduleError(null);
                                      setPerSportRows((rows) => rows.filter((_, i) => i !== idx));
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {rowIssue ? (
                              <p className="mt-2 text-xs text-destructive" role="alert">
                                {rowIssue}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                      <Button type="button" variant="outline" size="sm" onClick={addPerSportRow}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add sport window
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border p-3">
                <RadioGroupItem value="shared" id="sched-shared-dialog" className="mt-1" />
                <div className="min-w-0 flex-1 space-y-3">
                  <Label
                    htmlFor="sched-shared-dialog"
                    className="cursor-pointer font-medium leading-none"
                  >
                    Option 2: One Time Slot for Activity
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    One time range applies to every activity you select below.
                  </p>
                  {scheduleMode === "shared" && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Window start</Label>
                          <Select value={windowStartTime} onValueChange={setWindowStartTime}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {TIME_OPTIONS.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {toAmPmLabel(t)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Window end</Label>
                          <Select value={windowEndTime} onValueChange={setWindowEndTime}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {TIME_OPTIONS.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {toAmPmLabel(t)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Activity</Label>
                        <div className="flex flex-wrap gap-2">
                          {SPORT_OPTIONS.map(({ code, label }) => (
                            <Button
                              key={code}
                              type="button"
                              size="sm"
                              variant={selectedSports.includes(code) ? "default" : "outline"}
                              onClick={() => setSelectedSports((prev) => toggleSport(prev, code))}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Sports on this court share the same booking time grid.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Court status</Label>
            <div className="flex flex-wrap gap-2">
              {(["active", "maintenance"] as const).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={courtStatus === s ? "default" : "outline"}
                  size="sm"
                  className="capitalize"
                  onClick={() => setCourtStatus(s)}
                >
                  {s === "maintenance" ? "Inactive / maintenance" : "Active"}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Inactive courts are hidden from public booking until set active again.
            </p>
          </div>
          {formScheduleError && <p className="text-sm text-destructive">{formScheduleError}</p>}
        </div>
        <DialogFooter className="shrink-0 border-t bg-background/95 px-6 py-4 backdrop-blur-sm">
          <Button
            disabled={
              createCourt.isPending ||
              updateCourt.isPending ||
              (scheduleMode === "per_sport" && perSportHasBlockingIssue)
            }
            onClick={async () => {
              if (scheduleMode === "per_sport" && perSportHasBlockingIssue) {
                setFormScheduleError(null);
                return;
              }
              const msg = validateSchedule();
              if (msg) {
                setFormScheduleError(msg);
                return;
              }
              setFormScheduleError(null);
              const body = buildBody();
              if (!body) return;

              if (editingId) {
                await updateCourt.mutateAsync({
                  id: editingId,
                  body,
                });
              } else {
                await createCourt.mutateAsync(body);
              }
              onOpenChange(false);
              resetForm();
            }}
          >
            {editingId ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
