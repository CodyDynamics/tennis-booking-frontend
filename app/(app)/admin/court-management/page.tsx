"use client";

import { useMemo, useState, useEffect, type ReactNode } from "react";
import {
  useCourts,
  useCreateCourt,
  useUpdateCourt,
  useDeleteCourt,
  useLocations,
  useBookableLocations,
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

const COURTS_PAGE_SIZE = 10;

const SPORT_OPTIONS = [
  { code: "tennis", label: "Tennis" },
  { code: "pickleball", label: "Pickleball" },
  { code: "ball-machine", label: "Ball machine" },
] as const;

const ENV_OPTIONS = ["outdoor", "indoor"] as const;

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

  const { data: allLocations = [] } = useLocations();
  const { data: bookableLocs = [] } = useBookableLocations(user?.role === "super_user");
  const locations =
    user?.role === "super_user" && bookableLocs.length > 0 ? bookableLocs : allLocations;
  const { data: courts = [], isLoading: courtsLoading } = useCourts({
    locationId: locationId !== "all" ? locationId : undefined,
    search: search || undefined,
  });
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
    setModalOpen(true);
  };

  const sportsLabel = (c: Court) =>
    c.sports?.length ? c.sports.join(", ") : c.sport;

  const envLabel = (c: Court) =>
    c.courtTypes?.length ? c.courtTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ") : c.type;

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
        description="Courts are scoped by Location in the sidebar. Inactive courts are hidden from Court Time Slot until set active again."
        searchPlaceholder="Search by court name..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card>
        <CardContent className="pt-6">
          <AdminTable<Court>
            data={paginatedCourts}
            keyExtractor={(c) => c.id}
            emptyMessage="No courts."
            isLoading={courtsLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              {
                key: "name",
                label: "Court Name",
                render: (c) => <span className="font-medium">{c.name}</span>,
              },
              {
                key: "env",
                label: "Environment",
                render: (c) => <span className="text-sm">{envLabel(c)}</span>,
              },
              {
                key: "sports",
                label: "Sports",
                render: (c) => <span className="text-sm">{sportsLabel(c)}</span>,
              },
              {
                key: "locationName",
                label: "Location",
                render: (c) => c.locationName ?? "—",
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
          {!courtsLoading && filtered.length > 0 && (
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
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit court" : "Create court"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Label>Court Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Environment (indoor / outdoor)</Label>
              <p className="text-xs text-muted-foreground">Select one or both if the same court is used in multiple settings.</p>
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
                Inactive courts do not appear under Court Time Slot until set active again.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Sports on this court</Label>
              <p className="text-xs text-muted-foreground">
                Same physical court can host multiple sports; booking uses one shared time grid.
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
          <DialogFooter>
            <Button
              disabled={createCourt.isPending || updateCourt.isPending}
              onClick={async () => {
                const loc = courtFormLocationId || locations[0]?.id;
                if (!loc || !name.trim()) return;
                const sports = selectedSports.length ? selectedSports : ["tennis"];
                const courtTypes =
                  selectedCourtTypes.length > 0 ? selectedCourtTypes : (["outdoor"] as ("indoor" | "outdoor")[]);
                if (editingId) {
                  await updateCourt.mutateAsync({
                    id: editingId,
                    body: {
                      locationId: loc,
                      name: name.trim(),
                      courtTypes,
                      sports,
                      status: courtStatus,
                    },
                  });
                } else {
                  await createCourt.mutateAsync({
                    locationId: loc,
                    name: name.trim(),
                    courtTypes,
                    sports,
                    status: courtStatus,
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
            Are you sure you want to delete this court? This will also remove its related time slot
            rows once the court is gone.
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
