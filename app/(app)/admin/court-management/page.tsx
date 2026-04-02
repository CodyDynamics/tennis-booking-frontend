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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminFilter, AdminTable, AdminPagination } from "../components";
import type { Court } from "@/types";
import type { CourtBookingWindowAdminApi } from "@/lib/api/endpoints/courts";
import { formatCurrency } from "@/lib/format";

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

function toggleEnv(current: ("indoor" | "outdoor")[], code: "indoor" | "outdoor"): ("indoor" | "outdoor")[] {
  if (current.includes(code)) {
    const next = current.filter((s) => s !== code);
    return next.length ? next : current;
  }
  return [...current, code];
}

function activityLabel(c: Court) {
  return c.sports?.length ? c.sports.join(", ") : c.sport;
}

function venueTypeLabel(c: Court) {
  return c.courtTypes?.length
    ? c.courtTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")
    : c.type;
}

function formatAvailableTime(rows: CourtBookingWindowAdminApi[] | undefined): string {
  if (!rows?.length) return "—";
  return rows
    .map((w) => {
      const env = w.courtType === "indoor" ? "Indoor" : "Outdoor";
      const a = toAmPmLabel(normalizeGridTime(w.windowStartTime));
      const b = toAmPmLabel(normalizeGridTime(w.windowEndTime));
      return `${env} ${a}–${b}`;
    })
    .join("; ");
}

export default function AdminCourtManagementPage() {
  const { user } = useAuth();
  const { locationId } = useAdmin();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [courtFormLocationId, setCourtFormLocationId] = useState("");
  const [name, setName] = useState("");
  const [selectedCourtTypes, setSelectedCourtTypes] = useState<("indoor" | "outdoor")[]>(["outdoor"]);
  const [selectedSports, setSelectedSports] = useState<string[]>(["tennis"]);
  const [courtStatus, setCourtStatus] = useState<"active" | "maintenance">("active");
  const [windowStartTime, setWindowStartTime] = useState("08:00");
  const [windowEndTime, setWindowEndTime] = useState("11:00");
  const [pricePerHour, setPricePerHour] = useState(0);
  const [description, setDescription] = useState("");

  const { data: allLocations = [] } = useLocations();
  const { data: bookableLocs = [] } = useBookableLocations(user?.role === "super_user");
  const locations =
    user?.role === "super_user" && bookableLocs.length > 0 ? bookableLocs : allLocations;
  const { data: courts = [], isLoading: courtsLoading } = useCourts({
    locationId: locationId !== "all" ? locationId : undefined,
    search: search || undefined,
  });
  const { data: bookingWindows = [], isLoading: windowsLoading } = useCourtBookingWindows({});

  const windowsByCourtId = useMemo(() => {
    const m = new Map<string, CourtBookingWindowAdminApi[]>();
    for (const w of bookingWindows) {
      const arr = m.get(w.courtId) ?? [];
      arr.push(w);
      m.set(w.courtId, arr);
    }
    for (const arr of Array.from(m.values())) {
      arr.sort((a: CourtBookingWindowAdminApi, b: CourtBookingWindowAdminApi) =>
        a.courtType.localeCompare(b.courtType),
      );
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

  const filtered = useMemo(
    () =>
      courtsForUi.filter(
        (c) =>
          !search.trim() ||
          c.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [courtsForUi, search],
  );

  const [courtsPage, setCourtsPage] = useState(1);
  useEffect(() => {
    setCourtsPage(1);
  }, [search, locationId]);

  const paginatedCourts = useMemo(
    () =>
      filtered.slice(
        (courtsPage - 1) * COURTS_PAGE_SIZE,
        courtsPage * COURTS_PAGE_SIZE,
      ),
    [filtered, courtsPage],
  );

  const resetForm = () => {
    setEditingId(null);
    setCourtFormLocationId(locationId !== "all" ? locationId : (locations[0]?.id ?? ""));
    setName("");
    setSelectedCourtTypes(["outdoor"]);
    setSelectedSports(["tennis"]);
    setCourtStatus("active");
    setWindowStartTime("08:00");
    setWindowEndTime("11:00");
    setPricePerHour(0);
    setDescription("");
  };

  const openCreate = () => {
    resetForm();
    setCourtFormLocationId(
      locationId !== "all" ? locationId : (locations[0]?.id ?? ""),
    );
    setModalOpen(true);
  };

  const openEdit = (c: Court) => {
    setEditingId(c.id);
    setCourtFormLocationId(c.locationId ?? "");
    setName(c.name);
    setSelectedCourtTypes(c.courtTypes?.length ? [...c.courtTypes] : [c.type]);
    setSelectedSports(c.sports?.length ? [...c.sports] : [c.sport]);
    setCourtStatus(c.status);
    setPricePerHour(typeof c.pricePerHour === "number" ? c.pricePerHour : 0);
    setDescription(c.description ?? "");

    const wins = windowsByCourtId.get(c.id);
    const first = wins?.[0];
    if (first) {
      setWindowStartTime(normalizeGridTime(first.windowStartTime));
      setWindowEndTime(normalizeGridTime(first.windowEndTime));
    } else {
      setWindowStartTime("08:00");
      setWindowEndTime("11:00");
    }
    setModalOpen(true);
  };

  const tableLoading = courtsLoading || windowsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Court Management</h1>
        <Button
          onClick={() => {
            openCreate();
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Court
        </Button>
      </div>

      <AdminFilter
        title="Filters"
        description="Courts are scoped by location in the sidebar. Set booking hours, venue type, activity, and price when creating or editing a court."
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
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              {
                key: "name",
                label: "Court number",
                render: (c) => <span className="font-medium">{c.name}</span>,
              },
              {
                key: "activity",
                label: "Activity",
                render: (c) => <span className="text-sm">{activityLabel(c)}</span>,
              },
              {
                key: "locationName",
                label: "Location",
                render: (c) => c.locationName ?? "—",
              },
              {
                key: "available",
                label: "Available time",
                render: (c) => (
                  <span className="text-sm text-muted-foreground">
                    {formatAvailableTime(windowsByCourtId.get(c.id))}
                  </span>
                ),
              },
              {
                key: "venue",
                label: "Venue type",
                render: (c) => <span className="text-sm">{venueTypeLabel(c)}</span>,
              },
              {
                key: "price",
                label: "Price/hour",
                render: (c) => formatCurrency(c.pricePerHour ?? 0),
              },
              {
                key: "status",
                label: "Status",
                render: (c) => (
                  <span className={c.status === "active" ? "text-green-600" : "text-amber-600"}>
                    {c.status}
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
                render: (row: Court) => ReactNode;
              },
            ]}
          />
          {!tableLoading && filtered.length > 0 && (
            <AdminPagination
              page={courtsPage}
              pageSize={COURTS_PAGE_SIZE}
              total={filtered.length}
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
        <DialogContent className="flex max-h-[85vh] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
          <DialogHeader className="shrink-0 space-y-1.5 px-6 pb-2 pt-6 pr-14 text-left">
            <DialogTitle>{editingId ? "Edit court" : "Create court"}</DialogTitle>
          </DialogHeader>
          <div className="scrollbar-dialog min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-1">
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
            <div>
              <Label>Court number</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Court 1" />
            </div>
            <div className="space-y-2">
              <Label>Venue type</Label>
              <p className="text-xs text-muted-foreground">
                Indoor and/or outdoor if the same court is used in more than one setting. Booking hours below apply to each selected type.
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Window start</Label>
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
                <Label>Window end</Label>
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
            <div>
              <Label>Price per hour</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={pricePerHour || ""}
                onChange={(e) => setPricePerHour(parseFloat(e.target.value) || 0)}
              />
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
            <div className="space-y-2">
              <Label>Activity</Label>
              <p className="text-xs text-muted-foreground">
                Sports or activities on this court; they share the same booking time grid.
              </p>
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
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t bg-background/95 px-6 py-4 backdrop-blur-sm">
            <Button
              disabled={createCourt.isPending || updateCourt.isPending}
              onClick={async () => {
                const loc = courtFormLocationId || locations[0]?.id;
                if (!loc || !name.trim()) return;
                const sports = selectedSports.length ? selectedSports : ["tennis"];
                const courtTypes =
                  selectedCourtTypes.length > 0 ? selectedCourtTypes : (["outdoor"] as ("indoor" | "outdoor")[]);
                if (windowEndTime <= windowStartTime) return;

                if (editingId) {
                  await updateCourt.mutateAsync({
                    id: editingId,
                    body: {
                      locationId: loc,
                      name: name.trim(),
                      courtTypes,
                      sports,
                      status: courtStatus,
                      windowStartTime,
                      windowEndTime,
                      pricePerHour,
                      description: description.trim() || undefined,
                    },
                  });
                } else {
                  await createCourt.mutateAsync({
                    locationId: loc,
                    name: name.trim(),
                    courtTypes,
                    sports,
                    status: courtStatus,
                    windowStartTime,
                    windowEndTime,
                    pricePerHour,
                    description: description.trim() || undefined,
                  });
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
            Are you sure you want to delete this court? Related booking time windows are removed with the court.
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
