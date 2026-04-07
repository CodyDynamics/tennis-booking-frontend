"use client";

import { useMemo, useState, useEffect, type ReactNode } from "react";
import {
  useCourts,
  useDeleteCourt,
  useLocations,
  useBookableLocations,
  useCourtBookingWindows,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { useAdmin } from "../admin-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminFilter, AdminTable, AdminPagination } from "../components";
import { courtNameMatchesSearch } from "@/lib/court-name-search";
import { useDebouncedSearchValue } from "@/lib/hooks/use-debounced-search-value";
import type { Court } from "@/types";
import type { CourtBookingWindowAdminApi } from "@/lib/api/endpoints/courts";
import { AdminCourtFormDialog } from "../components/admin-court-form-dialog";
import { CourtAvailabilityCell } from "../court-availability-format";

const COURTS_PAGE_SIZE = 10;

function venueTypeLabel(c: Court) {
  return c.courtTypes?.length
    ? c.courtTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")
    : c.type;
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
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  const deleteCourt = useDeleteCourt();

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

  const openCreate = () => {
    setEditingCourt(null);
    setModalOpen(true);
  };

  const openEdit = (c: Court) => {
    setEditingCourt(c);
    setModalOpen(true);
  };

  const toggleColumnSort = (key: string) => {
    setSortState((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
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

      <AdminCourtFormDialog
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setEditingCourt(null);
        }}
        editingCourt={editingCourt}
        locations={locations}
        adminScopedLocationId={locationId}
      />

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
                    <CourtAvailabilityCell windows={windowsByCourtId.get(c.id)} />
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
