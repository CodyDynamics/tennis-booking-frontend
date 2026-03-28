"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { useAdmin } from "../admin-context";
import {
  useCourts,
  useBookableLocations,
  useBranches,
  useLocations,
  useAreas,
  useCreateCourt,
  useUpdateCourt,
  useDeleteCourt,
  useSports,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { api, ApiError } from "@/lib/api";
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

export default function AdminCourtsPage() {
  const { user } = useAuth();
  const { sport } = useAdmin();
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [modalBranchId, setModalBranchId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const canCreate = hasAdminPermission(user?.permissions, "courts:create", user?.role);
  const canUpdate = hasAdminPermission(user?.permissions, "courts:update", user?.role);
  const canDelete = hasAdminPermission(user?.permissions, "courts:delete", user?.role);

  const { data: courts = [], isLoading } = useCourts({
    branchId: branchId && branchId !== "all" ? branchId : undefined,
    status: status && status !== "all" ? status : undefined,
    search: search || undefined,
    sport,
  });

  const { data: bookableLocs = [] } = useBookableLocations(user?.role === "super_user");

  const courtsForUi = useMemo(() => {
    if (user?.role !== "super_user" || bookableLocs.length === 0) return courts;
    const allowed = new Set(bookableLocs.map((l) => l.id));
    return courts.filter((c) => Boolean(c.locationId && allowed.has(c.locationId)));
  }, [courts, bookableLocs, user?.role]);

  useEffect(() => {
    setPage(1);
  }, [search, branchId, status, sport, courtsForUi]);

  const paginatedCourts = useMemo(
    () => courtsForUi.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [courtsForUi, page]
  );
  const { data: branches = [] } = useBranches();
  const { data: sports = [] } = useSports();
  const locationsBranchId = modalOpen ? (modalBranchId ?? (branchId !== "all" ? branchId : branches[0]?.id)) : (branchId !== "all" ? branchId : branches[0]?.id);
  const { data: locations = [] } = useLocations(locationsBranchId);
  const { data: areas = [] } = useAreas();
  const createCourt = useCreateCourt();
  const updateCourt = useUpdateCourt();
  const deleteCourt = useDeleteCourt();

  const formDefaults = useMemo(
    () => ({
      branchId: editingCourt?.branchId ?? (branches[0]?.id ?? ""),
      areaId: editingCourt?.areaId ?? "",
      locationId: editingCourt?.locationId ?? (locations[0]?.id ?? ""),
      name: editingCourt?.name ?? "",
      type: (editingCourt?.type ?? "outdoor") as "indoor" | "outdoor",
      sport: editingCourt?.sport ?? sport ?? "tennis",
      pricePerHour: editingCourt?.pricePerHour ?? 0,
      description: editingCourt?.description ?? "",
      status: (editingCourt?.status ?? "active") as "active" | "maintenance",
      windowStartTime: "08:00",
      windowEndTime: "11:00",
    }),
    [editingCourt, branches, locations, sport]
  );

  const [form, setForm] = useState(formDefaults);

  const formTypeOptions = useMemo<Array<"indoor" | "outdoor">>(() => {
    if (form.sport === "ball-machine") return ["outdoor"];
    return ["outdoor", "indoor"];
  }, [form.sport]);

  const courtNameOptions = useMemo(() => {
    const selectedArea = areas.find((a) => a.id === form.areaId);
    const byLocation = courtsForUi.filter((c) => {
      if (selectedArea?.locationId && c.locationId !== selectedArea.locationId) {
        return false;
      }
      if (form.areaId && c.areaId && c.areaId !== form.areaId) {
        return false;
      }
      return true;
    });
    return Array.from(new Set(byLocation.map((c) => c.name))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [courtsForUi, areas, form.areaId]);

  useEffect(() => {
    if (!formTypeOptions.includes(form.type)) {
      setForm((f) => ({ ...f, type: formTypeOptions[0] }));
    }
  }, [form.type, formTypeOptions]);

  const resetForm = () => {
    setEditingCourt(null);
    setForm({
      branchId: branches[0]?.id ?? "",
      areaId: "",
      locationId: locations[0]?.id ?? "",
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
    setModalBranchId(branchId !== "all" ? branchId : branches[0]?.id);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (court: Court) => {
    setModalBranchId(court.branchId ?? undefined);
    setEditingCourt(court);
    setForm({
      branchId: court.branchId ?? branches[0]?.id ?? "",
      areaId: court.areaId ?? "",
      locationId: court.locationId ?? "",
      name: court.name,
      type: court.type,
      sport: court.sport,
      pricePerHour: court.pricePerHour,
      description: court.description ?? "",
      status: court.status,
      windowStartTime: "08:00",
      windowEndTime: "11:00",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.areaId && !editingCourt) return;
    const selectedArea = areas.find((a) => a.id === form.areaId);
    const resolvedLocationId = selectedArea?.locationId ?? form.locationId;
    if (!resolvedLocationId) return;
    const body = {
      locationId: resolvedLocationId,
      areaId: form.areaId || undefined,
      name: form.name,
      type: form.type,
      sport: form.sport,
      pricePerHour: form.pricePerHour,
      description: form.description || undefined,
      status: form.status,
      windowStartTime: form.windowStartTime,
      windowEndTime: form.windowEndTime,
    };
    const err = editingCourt
      ? await updateCourt
          .mutateAsync({ id: editingCourt.id, body: { ...body, locationId: resolvedLocationId || undefined } })
          .then(() => null)
          .catch((e) => e)
      : await createCourt.mutateAsync(body as Parameters<typeof api.courts.createCourt>[0]).then(() => null).catch((e) => e);

    if (err) return;
    setModalOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteCourt.mutateAsync(id).catch(() => {});
    setDeleteConfirmId(null);
  };

  const submitError =
    createCourt.error instanceof ApiError
      ? createCourt.error
      : updateCourt.error instanceof ApiError
        ? updateCourt.error
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Court Time Slot</h1>
        {canCreate && (
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
        description="Filter by branch (location), then view courts at that location"
        searchPlaceholder="Search by name..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </AdminFilter>

      <Card>
        <CardContent className="pt-6">
          <AdminTable<Court>
            data={paginatedCourts}
            keyExtractor={(c) => c.id}
            emptyMessage="No courts found."
            isLoading={isLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              { key: "name", label: "Name", render: (c) => <span className="font-medium">{c.name}</span> },
              {
                key: "locationName",
                label: "Location",
                render: (c) => c.locationName ?? branches.find((b) => b.id === c.branchId)?.name ?? "—",
              },
              { key: "type", label: "Type", render: (c) => c.type },
              { key: "pricePerHour", label: "Price/hour", render: (c) => formatCurrency(c.pricePerHour) },
              {
                key: "status",
                label: "Status",
                render: (c) => (
                  <span className={c.status === "active" ? "text-green-600" : "text-amber-600"}>
                    {c.status}
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
                      render: (court: Court) => (
                        <>
                          {canUpdate && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(court)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteConfirmId(court.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      ),
                    } as { key: string; label: string; headClassName?: string; className?: string; render: (row: Court) => React.ReactNode },
                  ]
                : []),
            ]}
          />
          {!isLoading && courtsForUi.length > 0 && (
            <AdminPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={courtsForUi.length}
              onPageChange={setPage}
              className="mt-4 border-t pt-4"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle>{editingCourt ? "Edit Court Time Slot" : "Create Court Time Slot"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pr-2">
            {submitError && (
              <p className="text-sm text-destructive">
                {submitError.body?.message ?? submitError.message}
              </p>
            )}
            <div>
              <Label>Area</Label>
              <Select
                value={form.areaId}
                onValueChange={(v) => {
                  const area = areas.find((a) => a.id === v);
                  setForm((f) => ({
                    ...f,
                    areaId: v,
                    locationId: area?.locationId ?? f.locationId,
                  }));
                }}
                required
                disabled={areas.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Court</Label>
              <Select
                value={form.name}
                onValueChange={(v) => setForm((f) => ({ ...f, name: v }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select court from Court Management" />
                </SelectTrigger>
                <SelectContent>
                  {courtNameOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sport</Label>
              <Select
                value={form.sport}
                onValueChange={(v) => setForm((f) => ({ ...f, sport: v }))}
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
              <Label>Status</Label>
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
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={createCourt.isPending || updateCourt.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCourt.isPending || updateCourt.isPending} aria-busy={createCourt.isPending || updateCourt.isPending}>
                {(createCourt.isPending || updateCourt.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {createCourt.isPending ? "Creating…" : updateCourt.isPending ? "Saving…" : editingCourt ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete court</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this court? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteCourt.isPending}
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
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
