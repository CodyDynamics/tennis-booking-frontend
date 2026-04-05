"use client";

import { useMemo, useState, useEffect, type ReactNode } from "react";
import {
  useCourts,
  useCreateCourt,
  useUpdateCourt,
  useDeleteCourt,
  useLocations,
  useBookableLocations,
  useCourtBookingWindows,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { useAdmin } from "../admin-context";
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
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminFilter, AdminTable, AdminPagination } from "../components";
import { cn } from "@/lib/utils";
import { courtNameMatchesSearch } from "@/lib/court-name-search";
import { useDebouncedSearchValue } from "@/lib/hooks/use-debounced-search-value";
import type { Court } from "@/types";
import type { CourtBookingWindowAdminApi } from "@/lib/api/endpoints/courts";

const COURTS_PAGE_SIZE = 10;

const SPORT_OPTIONS = [
  { code: "tennis", label: "Tennis" },
  { code: "pickleball", label: "Pickleball" },
  { code: "ball-machine", label: "Ball machine" },
] as const;

const ENV_OPTIONS = ["outdoor", "indoor"] as const;

const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

function toAmPmLabel(hhmm: string): string {
  const [hStr, m] = hhmm.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12.toString().padStart(2, "0")}:${m} ${suffix}`;
}

function normalizeGridTime(t: string): string {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "08:00";
  let h = parseInt(m[1], 10);
  if (h > 23) h = 23;
  const mm = m[2] === "30" ? "30" : "00";
  return `${String(h).padStart(2, "0")}:${mm}`;
}

function toggleSport(current: string[], code: string): string[] {
  if (current.includes(code)) {
    const next = current.filter((s) => s !== code);
    return next.length ? next : current;
  }
  return [...current, code];
}

function toggleEnv(
  current: ("indoor" | "outdoor")[],
  code: "indoor" | "outdoor",
): ("indoor" | "outdoor")[] {
  if (current.includes(code)) {
    const next = current.filter((s) => s !== code);
    return next.length ? next : current;
  }
  return [...current, code];
}

function venueTypeLabel(c: Court) {
  return c.courtTypes?.length
    ? c.courtTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")
    : c.type;
}

function sportDisplay(code: string): string {
  const c = code.trim().toLowerCase();
  if (c === "ball-machine") return "Ball machine";
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : code;
}

function defaultCourtFormLocation(
  adminLocationId: string,
  locations: { id: string; name: string }[],
): string {
  if (adminLocationId !== "all") return adminLocationId;
  const sp = locations.find((l) => /springpark/i.test(l.name.trim()));
  return sp?.id ?? locations[0]?.id ?? "";
}

type PerSportRow = { sport: string; windowStartTime: string; windowEndTime: string };

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
function perSportRowIssues(rows: PerSportRow[]): (string | null)[] {
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

function formatAvailabilityCell(windows: CourtBookingWindowAdminApi[] | undefined): ReactNode {
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

function cmpLocale(a: string, b: string, dir: "asc" | "desc"): number {
  const x = a.localeCompare(b, undefined, { sensitivity: "base" });
  return dir === "asc" ? x : -x;
}

export default function AdminCourtManagementPage() {
  const { user } = useAuth();
  const { locationId } = useAdmin();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedSearchValue(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const [sortState, setSortState] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const { data: allLocations = [] } = useLocations();
  const { data: bookableLocs = [] } = useBookableLocations(user?.role === "super_user");
  const locations =
    user?.role === "super_user" && bookableLocs.length > 0 ? bookableLocs : allLocations;
  const courtListSearchParam =
    debouncedSearch.length > 0 && debouncedSearch.trim() === ""
      ? undefined
      : debouncedSearch || undefined;

  const { data: courts = [], isLoading: courtsLoading } = useCourts({
    locationId: locationId !== "all" ? locationId : undefined,
    search: courtListSearchParam,
  });
  const { data: bookingWindows = [], isLoading: windowsLoading } = useCourtBookingWindows({});

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
  const deleteCourt = useDeleteCourt();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const courtsForUi = useMemo(() => {
    if (user?.role !== "super_user" || bookableLocs.length === 0) return courts;
    const allowed = new Set(bookableLocs.map((l) => l.id));
    return courts.filter((c) => Boolean(c.locationId && allowed.has(c.locationId)));
  }, [courts, bookableLocs, user?.role]);

  const filtered = useMemo(() => {
    if (!search.trim()) return courtsForUi;
    return courtsForUi.filter((c) => courtNameMatchesSearch(c.name, search));
  }, [courtsForUi, search]);

  const sortedFiltered = useMemo(() => {
    if (!sortState) return filtered;
    const { key, dir } = sortState;
    const arr = [...filtered];
    arr.sort((c1, c2) => {
      switch (key) {
        case "name":
          return cmpLocale(c1.name, c2.name, dir);
        case "locationName":
          return cmpLocale(c1.locationName ?? "", c2.locationName ?? "", dir);
        case "venue":
          return cmpLocale(venueTypeLabel(c1), venueTypeLabel(c2), dir);
        case "status":
          return cmpLocale(c1.status, c2.status, dir);
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortState]);

  const [courtsPage, setCourtsPage] = useState(1);
  useEffect(() => {
    setCourtsPage(1);
  }, [debouncedSearch, locationId, sortState]);

  const paginatedCourts = useMemo(
    () =>
      sortedFiltered.slice(
        (courtsPage - 1) * COURTS_PAGE_SIZE,
        courtsPage * COURTS_PAGE_SIZE,
      ),
    [sortedFiltered, courtsPage],
  );

  const resetForm = () => {
    setEditingId(null);
    setCourtFormLocationId(defaultCourtFormLocation(locationId, locations));
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
  };

  const openCreate = () => {
    resetForm();
    setCourtFormLocationId(defaultCourtFormLocation(locationId, locations));
    setModalOpen(true);
  };

  const openEdit = (c: Court) => {
    setEditingId(c.id);
    setCourtFormLocationId(c.locationId ?? "");
    setName(c.name);
    setSelectedCourtTypes(c.courtTypes?.length ? [...c.courtTypes] : [c.type]);
    setSelectedSports(c.sports?.length ? [...c.sports] : [c.sport]);
    setCourtStatus(c.status);
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
    setModalOpen(true);
  };

  const toggleColumnSort = (key: string) => {
    setSortState((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

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

  const tableLoading = courtsLoading || windowsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Court Management</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Court
        </Button>
      </div>

      <AdminFilter
        title="Filters"
        description="Courts follow the location selected in the sidebar. Set venue type and booking hours when creating or editing a court."
        searchPlaceholder="Search by court number..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card>
        <CardContent className="pt-6">
          <AdminTable<Court>
            data={paginatedCourts}
            keyExtractor={(c) => c.id}
            emptyMessage="No courts."
            isLoading={tableLoading}
            sortKey={sortState?.key ?? null}
            sortDir={sortState?.dir ?? "asc"}
            onColumnSort={toggleColumnSort}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              {
                key: "name",
                label: "No.",
                sortable: true,
                render: (c) => <span className="font-medium">{c.name}</span>,
              },
              {
                key: "locationName",
                label: "Location",
                sortable: true,
                render: (c) => c.locationName ?? "—",
              },
              {
                key: "available",
                label: "Available time",
                render: (c) => (
                  <div className="text-sm text-muted-foreground">
                    {formatAvailabilityCell(windowsByCourtId.get(c.id))}
                  </div>
                ),
              },
              {
                key: "venue",
                label: "Venue type",
                sortable: true,
                render: (c) => <span className="text-sm">{venueTypeLabel(c)}</span>,
              },
              {
                key: "status",
                label: "Status",
                sortable: true,
                render: (c) => (
                  <span className={c.status === "active" ? "text-green-600" : "text-amber-600"}>
                    {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                  </span>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                className: "text-right",
                headClassName: "text-right",
                render: (c) => (
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteConfirmId(c.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ),
              } as {
                key: string;
                label: string;
                className?: string;
                headClassName?: string;
                sortable?: boolean;
                render: (row: Court) => ReactNode;
              },
            ]}
          />
          {!tableLoading && sortedFiltered.length > 0 && (
            <AdminPagination
              page={courtsPage}
              pageSize={COURTS_PAGE_SIZE}
              total={sortedFiltered.length}
              onPageChange={setCourtsPage}
              className="mt-4 border-t pt-4"
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) resetForm();
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
                  <RadioGroupItem value="per_sport" id="sched-per" className="mt-1" />
                  <div className="min-w-0 flex-1 space-y-3">
                    <Label htmlFor="sched-per" className="cursor-pointer font-medium leading-none">
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
                  <RadioGroupItem value="shared" id="sched-shared" className="mt-1" />
                  <div className="min-w-0 flex-1 space-y-3">
                    <Label htmlFor="sched-shared" className="cursor-pointer font-medium leading-none">
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
                setModalOpen(false);
                resetForm();
              }}
            >
              {editingId ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete court</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this court? Related booking time windows are removed with
            the court.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteCourt.isPending}
              onClick={() => deleteConfirmId && deleteCourt.mutate(deleteConfirmId)}
              aria-busy={deleteCourt.isPending}
            >
              {deleteCourt.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteCourt.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
