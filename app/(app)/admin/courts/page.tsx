"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { useAdmin } from "../admin-context";
import {
  useCourts,
  useCourtBookingWindows,
  useBookableLocations,
  useUpdateCourt,
  useDeleteCourtBookingWindow,
  useSports,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import type { CourtBookingWindowAdminApi } from "@/lib/api/endpoints/courts";
import type { Court } from "@/types";
import { AdminFilter, AdminTable, AdminPagination } from "../components";
import { hasAdminPermission } from "@/lib/admin-rbac";

const PAGE_SIZE = 10;
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

/** Map API time to grid values used in selects (30-min steps). */
function normalizeGridTime(t: string): string {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "08:00";
  let h = parseInt(m[1], 10);
  if (h > 23) h = 23;
  const mm = m[2] === "30" ? "30" : "00";
  return `${String(h).padStart(2, "0")}:${mm}`;
}

export default function AdminCourtsPage() {
  const { user } = useAuth();
  const { sport, locationId: adminLocationId } = useAdmin();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<CourtBookingWindowAdminApi | null>(null);
  const [deleteConfirmWindowId, setDeleteConfirmWindowId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate = hasAdminPermission(user?.permissions, "courts:create", user?.role);
  const canUpdate = hasAdminPermission(user?.permissions, "courts:update", user?.role);
  const canDelete = hasAdminPermission(user?.permissions, "courts:delete", user?.role);

  const { data: bookableLocs = [] } = useBookableLocations(user?.role === "super_user");

  const { data: timeSlots = [], isLoading: slotsLoading } = useCourtBookingWindows({
    search: search || undefined,
  });

  const { data: pickerCourtsRaw = [], isLoading: pickerLoading } = useCourts({});

  const pickerCourtsForUi = useMemo(() => {
    let rows = pickerCourtsRaw;
    if (adminLocationId !== "all") {
      rows = rows.filter((c) => c.locationId === adminLocationId);
    }
    if (user?.role !== "super_user" || bookableLocs.length === 0) return rows;
    const allowed = new Set(bookableLocs.map((l) => l.id));
    return rows.filter((c) => Boolean(c.locationId && allowed.has(c.locationId)));
  }, [pickerCourtsRaw, bookableLocs, user?.role, adminLocationId]);

  const slotsForUi = useMemo(() => {
    let rows = timeSlots;
    if (adminLocationId !== "all") {
      rows = rows.filter((s) => s.locationId === adminLocationId);
    }
    if (user?.role !== "super_user" || bookableLocs.length === 0) return rows;
    const allowed = new Set(bookableLocs.map((l) => l.id));
    return rows.filter((s) => allowed.has(s.locationId));
  }, [timeSlots, bookableLocs, user?.role, adminLocationId]);

  useEffect(() => {
    setPage(1);
  }, [search, slotsForUi]);

  const paginatedSlots = useMemo(
    () => slotsForUi.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [slotsForUi, page],
  );

  const { data: sports = [] } = useSports();
  const updateCourt = useUpdateCourt();
  const deleteCourtSlot = useDeleteCourtBookingWindow();

  const courtPickerOptions = useMemo(() => {
    const list = [...pickerCourtsForUi];
    if (editingRow) {
      const exists = list.some((c) => c.id === editingRow.courtId);
      if (!exists) {
        const synthetic: Court = {
          id: editingRow.courtId,
          name: editingRow.courtName,
          type: editingRow.courtType === "indoor" ? "indoor" : "outdoor",
          sports: [editingRow.sport],
          sport: editingRow.sport,
          pricePerHour: editingRow.pricePerHour,
          status: editingRow.courtStatus as Court["status"],
          locationId: editingRow.locationId,
          locationName: editingRow.locationName,
          description: editingRow.description ?? undefined,
        };
        list.push(synthetic);
      }
    }
    return list.sort(
      (a, b) =>
        (a.locationName ?? "").localeCompare(b.locationName ?? "") || a.name.localeCompare(b.name),
    );
  }, [pickerCourtsForUi, editingRow]);

  const [form, setForm] = useState({
    selectedCourtId: "",
    locationId: "",
    name: "",
    type: "outdoor" as "indoor" | "outdoor",
    sport: "tennis",
    pricePerHour: 0,
    description: "",
    status: "active" as "active" | "maintenance",
    windowStartTime: "08:00",
    windowEndTime: "11:00",
  });

  const formTypeOptions = useMemo<Array<"indoor" | "outdoor">>(() => {
    if (form.sport === "ball-machine") return ["outdoor"];
    return ["outdoor", "indoor"];
  }, [form.sport]);

  useEffect(() => {
    if (!formTypeOptions.includes(form.type)) {
      setForm((f) => ({ ...f, type: formTypeOptions[0] }));
    }
  }, [form.type, formTypeOptions]);

  const resetForm = () => {
    setEditingRow(null);
    setFormError(null);
    setForm({
      selectedCourtId: "",
      locationId: "",
      name: "",
      type: "outdoor",
      sport: sport ?? "tennis",
      pricePerHour: 0,
      description: "",
      status: "active",
      windowStartTime: "08:00",
      windowEndTime: "11:00",
    });
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (row: CourtBookingWindowAdminApi) => {
    setFormError(null);
    setEditingRow(row);
    setForm({
      selectedCourtId: row.courtId,
      locationId: row.locationId,
      name: row.courtName,
      type: row.courtType === "indoor" ? "indoor" : "outdoor",
      sport: row.sport,
      pricePerHour: row.pricePerHour,
      description: row.description ?? "",
      status: row.courtStatus === "maintenance" ? "maintenance" : "active",
      windowStartTime: normalizeGridTime(row.windowStartTime),
      windowEndTime: normalizeGridTime(row.windowEndTime),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const resolvedLocationId = form.locationId?.trim();
    if (!resolvedLocationId) {
      setFormError("Select a court from Court Management (it includes the location).");
      return;
    }
    const courtId = editingRow?.courtId ?? form.selectedCourtId;
    if (!courtId) {
      setFormError("Select a court from the list (create courts under Court Management first).");
      return;
    }
    const body = {
      locationId: resolvedLocationId,
      name: form.name,
      type: form.type,
      sport: form.sport,
      pricePerHour: form.pricePerHour,
      description: form.description || undefined,
      status: form.status,
      windowStartTime: form.windowStartTime,
      windowEndTime: form.windowEndTime,
    };

    const err = await updateCourt
      .mutateAsync({ id: courtId, body })
      .then(() => null)
      .catch((e) => e);

    if (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setFormError(Array.isArray(msg) ? msg.join(", ") : (msg ?? err.message));
      }
      return;
    }
    setModalOpen(false);
    resetForm();
  };

  const handleDeleteSlot = async (windowId: string) => {
    await deleteCourtSlot.mutateAsync(windowId).catch(() => {});
    setDeleteConfirmWindowId(null);
  };

  const submitError = updateCourt.error instanceof ApiError ? updateCourt.error : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Court Time Slot
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Configure booking hours and pricing for courts that already exist in{" "}
            <strong>Court Management</strong>. New courts do not appear here until you add a time
            window.
          </p>
        </div>
        {(canCreate || canUpdate) && (
          <Button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Court Time Slot
          </Button>
        )}
      </div>

      <AdminFilter
        title="Filters"
        description="Per-court time slots. Scoped by location in the admin sidebar when set."
        searchPlaceholder="Search court or location name..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card>
        <CardContent className="pt-6">
          <AdminTable<CourtBookingWindowAdminApi>
            data={paginatedSlots}
            keyExtractor={(r) => r.id}
            emptyMessage="No time slots yet. Add a slot for a court from Court Management."
            isLoading={slotsLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              {
                key: "court",
                label: "Court",
                render: (r) => <span className="font-medium">{r.courtName}</span>,
              },
              { key: "sport", label: "Sport", render: (r) => r.sport },
              {
                key: "locationName",
                label: "Location",
                render: (r) => r.locationName || "—",
              },
              {
                key: "window",
                label: "Time window",
                render: (r) =>
                  `${toAmPmLabel(normalizeGridTime(r.windowStartTime))} – ${toAmPmLabel(normalizeGridTime(r.windowEndTime))}`,
              },
              { key: "type", label: "Type", render: (r) => r.courtType },
              {
                key: "pricePerHour",
                label: "Price/hour",
                render: (r) => formatCurrency(r.pricePerHour),
              },
              {
                key: "courtStatus",
                label: "Court status",
                render: (r) => (
                  <span className={r.courtStatus === "active" ? "text-green-600" : "text-amber-600"}>
                    {r.courtStatus}
                  </span>
                ),
              },
              {
                key: "slot",
                label: "Slot",
                render: (r) => (
                  <span className={r.isActive ? "text-green-600" : "text-muted-foreground"}>
                    {r.isActive ? "active" : "off"}
                  </span>
                ),
              },
              ...(canUpdate || canDelete
                ? [
                    {
                      key: "actions",
                      label: "Actions",
                      headClassName: "text-right",
                      className: "text-right",
                      render: (row: CourtBookingWindowAdminApi) => (
                        <>
                          {canUpdate && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteConfirmWindowId(row.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      ),
                    } as {
                      key: string;
                      label: string;
                      headClassName?: string;
                      className?: string;
                      render: (row: CourtBookingWindowAdminApi) => React.ReactNode;
                    },
                  ]
                : []),
            ]}
          />
          {!slotsLoading && slotsForUi.length > 0 && (
            <AdminPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={slotsForUi.length}
              onPageChange={setPage}
              className="mt-4 border-t pt-4"
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            resetForm();
            updateCourt.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl rounded-2xl border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle>
              {editingRow ? "Edit Court Time Slot" : "Create Court Time Slot"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pr-2">
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            {submitError && !formError && (
              <p className="text-sm text-destructive">
                {submitError.body?.message ?? submitError.message}
              </p>
            )}
            <div>
              <Label>Court</Label>
              <p className="text-muted-foreground text-xs mb-2">
                Choose a court from <strong>Court Management</strong>. This defines which court gets
                the booking window and pricing below.
              </p>
              <Select
                value={editingRow ? form.selectedCourtId : form.selectedCourtId || "__none__"}
                onValueChange={(id) => {
                  setFormError(null);
                  if (id === "__none__") {
                    setForm((f) => ({
                      ...f,
                      selectedCourtId: "",
                      locationId: "",
                    }));
                    return;
                  }
                  const c = courtPickerOptions.find((x) => x.id === id);
                  if (!c) return;
                  setForm((f) => ({
                    ...f,
                    selectedCourtId: id,
                    locationId: c.locationId ?? "",
                    name: c.name,
                    sport: c.sports?.[0] ?? c.sport,
                    type: c.type,
                  }));
                }}
                disabled={!!editingRow || pickerLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      courtPickerOptions.length === 0
                        ? "No courts — add one in Court Management"
                        : "Select court"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {!editingRow && <SelectItem value="__none__">Select…</SelectItem>}
                  {courtPickerOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {`${c.locationName ? `${c.locationName} — ` : ""}${c.name} (${c.sports?.length ? c.sports.join(", ") : c.sport})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sport</Label>
              <Select
                value={form.sport}
                onValueChange={(v) => {
                  setFormError(null);
                  setForm((f) => ({ ...f, sport: v }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  {sports.map((s) => (
                    <SelectItem key={s.id} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as "indoor" | "outdoor" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formTypeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === "indoor" ? "Indoor" : "Outdoor"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Window start</Label>
                <Select
                  value={form.windowStartTime}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, windowStartTime: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select start time" />
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
                <Select
                  value={form.windowEndTime}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, windowEndTime: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select end time" />
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
                value={form.pricePerHour || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pricePerHour: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label>Court status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    status: v as "active" | "maintenance",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={updateCourt.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateCourt.isPending} aria-busy={updateCourt.isPending}>
                {updateCourt.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {updateCourt.isPending ? "Saving…" : editingRow ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmWindowId} onOpenChange={() => setDeleteConfirmWindowId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove time slot</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            This removes the booking window only. The court stays in Court Management.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmWindowId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteCourtSlot.isPending}
              onClick={() => deleteConfirmWindowId && handleDeleteSlot(deleteConfirmWindowId)}
              aria-busy={deleteCourtSlot.isPending}
            >
              {deleteCourtSlot.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteCourtSlot.isPending ? "Removing…" : "Remove slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
