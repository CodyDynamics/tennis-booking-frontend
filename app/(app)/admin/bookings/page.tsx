"use client";

import { useMemo, useState, useEffect } from "react";
import { useAdmin } from "../admin-context";
import { useAdminCourtBookings, useAdminUpdateCourtBooking, useLocations } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { AdminFilter, AdminPagination, AdminTable } from "../components";
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
import { Loader2, Pencil } from "lucide-react";
import type { AdminCourtBookingRowApi } from "@/lib/api/endpoints/bookings";
import { ApiError } from "@/lib/api";
import { formatTime, titleCaseFilterLabel } from "@/lib/format";
import { useDebouncedSearchValue } from "@/lib/hooks/use-debounced-search-value";

const PAGE_SIZE = 20;

/** Temporarily hide row Actions (edit); set to `true` to restore. */
const SHOW_BOOKING_ACTIONS_COLUMN = false;

const BOOKING_STATUS = ["pending", "confirmed", "cancelled", "completed"] as const;
const PAYMENT_STATUS = ["unpaid", "paid", "refunded"] as const;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function AdminBookingsPage() {
  const { locationId: adminLocationId } = useAdmin();
  const { data: locations = [] } = useLocations();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedSearchValue(search);
  const [status, setStatus] = useState<string>("all");
  const [paymentStatus, setPaymentStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return ymd(d);
  });
  const [to, setTo] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return ymd(d);
  });
  const [page, setPage] = useState(1);

  const scopedLocationId = adminLocationId !== "all" ? adminLocationId : undefined;

  const { data: rowsRaw = [], isLoading } = useAdminCourtBookings({
    locationId: scopedLocationId,
    search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
    from: from || undefined,
    to: to || undefined,
    status: status !== "all" ? status : undefined,
    paymentStatus: paymentStatus !== "all" ? paymentStatus : undefined,
  });

  const rowsForUi = useMemo(() => {
    // Extra client-side filter to be safe when admin sidebar location is set.
    if (!scopedLocationId) return rowsRaw;
    return rowsRaw.filter((r) => r.locationId === scopedLocationId);
  }, [rowsRaw, scopedLocationId]);

  const locationNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations) m.set(l.id, l.name);
    return m;
  }, [locations]);

  useEffect(() => setPage(1), [debouncedSearch, status, paymentStatus, from, to, adminLocationId]);

  const [sortState, setSortState] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  useEffect(() => setPage(1), [sortState]);

  function cmpLocale(a: string, b: string, dir: "asc" | "desc"): number {
    const x = a.localeCompare(b, undefined, { sensitivity: "base" });
    return dir === "asc" ? x : -x;
  }

  const sortedRows = useMemo(() => {
    if (!sortState) return rowsForUi;
    const { key, dir } = sortState;
    return [...rowsForUi].sort((r1, r2) => {
      switch (key) {
        case "date":
          return cmpLocale(
            String(r1.bookingDate).slice(0, 10),
            String(r2.bookingDate).slice(0, 10),
            dir,
          );
        case "court":
          return cmpLocale(r1.court?.name ?? r1.courtId, r2.court?.name ?? r2.courtId, dir);
        case "user":
          return cmpLocale(
            r1.user?.fullName ?? r1.user?.email ?? r1.userId,
            r2.user?.fullName ?? r2.user?.email ?? r2.userId,
            dir,
          );
        case "location":
          return cmpLocale(
            r1.location?.name ??
              (r1.locationId ? (locationNameById.get(r1.locationId) ?? r1.locationId) : ""),
            r2.location?.name ??
              (r2.locationId ? (locationNameById.get(r2.locationId) ?? r2.locationId) : ""),
            dir,
          );
        case "sport":
          return cmpLocale(r1.sport ?? "", r2.sport ?? "", dir);
        case "payment":
          return cmpLocale(r1.paymentStatus ?? "", r2.paymentStatus ?? "", dir);
        case "status":
          return cmpLocale(r1.bookingStatus ?? "", r2.bookingStatus ?? "", dir);
        default:
          return 0;
      }
    });
  }, [rowsForUi, sortState, locationNameById]);

  const paginated = useMemo(
    () => sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedRows, page],
  );

  const toggleColumnSort = (key: string) => {
    setSortState((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCourtBookingRowApi | null>(null);
  const [editForm, setEditForm] = useState({
    bookingStatus: "confirmed",
    paymentStatus: "unpaid",
  });

  const update = useAdminUpdateCourtBooking();

  const openEdit = (r: AdminCourtBookingRowApi) => {
    setEditing(r);
    setEditForm({
      bookingStatus: (r.bookingStatus as string) || "confirmed",
      paymentStatus: (r.paymentStatus as string) || "unpaid",
    });
    setOpen(true);
  };

  const submitError = update.error instanceof ApiError ? update.error : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            All court bookings across users. Use filters to narrow by date range and location.
          </p>
        </div>
      </div>

      <AdminFilter
        title="Filters"
        description="Search by user email/name or court name."
        searchPlaceholder="Search user or court..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[160px] h-10"
            aria-label="From date"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[160px] h-10"
            aria-label="To date"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="Booking status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {BOOKING_STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {titleCaseFilterLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              {PAYMENT_STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {titleCaseFilterLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AdminFilter>

      <Card>
        <CardContent className="pt-6">
          <AdminTable<AdminCourtBookingRowApi>
            data={paginated}
            keyExtractor={(r) => r.id}
            emptyMessage="No bookings match your filters."
            isLoading={isLoading}
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
                key: "date",
                label: "Date",
                sortable: true,
                render: (r) => String(r.bookingDate).slice(0, 10),
              },
              {
                key: "time",
                label: "Time",
                render: (r) =>
                  `${formatTime(String(r.startTime))}–${formatTime(String(r.endTime))}`,
              },
              {
                key: "court",
                label: "Court",
                sortable: true,
                render: (r) => r.court?.name ?? r.courtId,
              },
              {
                key: "user",
                label: "User",
                sortable: true,
                render: (r) => (
                  <div className="text-sm">
                    <div className="font-medium">{r.user?.fullName ?? "—"}</div>
                    <div className="text-muted-foreground">{r.user?.email ?? r.userId}</div>
                  </div>
                ),
              },
              {
                key: "location",
                label: "Location",
                sortable: true,
                render: (r) =>
                  r.location?.name ??
                  (r.locationId ? locationNameById.get(r.locationId) ?? r.locationId : "—"),
              },
              {
                key: "sport",
                label: "Sport",
                sortable: true,
                render: (r) => titleCaseFilterLabel(r.sport ?? "—"),
              },
              {
                key: "courtType",
                label: "Env",
                render: (r) => titleCaseFilterLabel(r.courtType ?? "—"),
              },
              {
                key: "payment",
                label: "Payment",
                sortable: true,
                render: (r) => titleCaseFilterLabel(r.paymentStatus ?? "—"),
              },
              {
                key: "status",
                label: "Status",
                sortable: true,
                render: (r) => titleCaseFilterLabel(r.bookingStatus ?? "—"),
              },
              ...(SHOW_BOOKING_ACTIONS_COLUMN
                ? [
                    {
                      key: "actions",
                      label: "Actions",
                      headClassName: "text-right",
                      className: "text-right",
                      render: (r: AdminCourtBookingRowApi) => (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ),
                    },
                  ]
                : []),
            ]}
          />

          {!isLoading && sortedRows.length > 0 && (
            <AdminPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={sortedRows.length}
              onPageChange={setPage}
              className="mt-4 border-t pt-4"
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditing(null);
            update.reset();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit booking</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {submitError && (
                <p className="text-sm text-destructive">
                  {Array.isArray(submitError.body?.message)
                    ? submitError.body.message.join(", ")
                    : submitError.body?.message ?? submitError.message}
                </p>
              )}
              <div className="text-sm rounded-md border bg-muted/40 px-3 py-2">
                <div className="font-medium">
                  {String(editing.bookingDate).slice(0, 10)}{" "}
                  {formatTime(String(editing.startTime))}–
                  {formatTime(String(editing.endTime))}
                </div>
                <div className="text-muted-foreground">
                  {editing.court?.name ?? editing.courtId} · {editing.user?.email ?? editing.userId}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Booking status</Label>
                  <Select
                    value={editForm.bookingStatus}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, bookingStatus: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOKING_STATUS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment</Label>
                  <Select
                    value={editForm.paymentStatus}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, paymentStatus: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={update.isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await update.mutateAsync({
                      id: editing.id,
                      body: {
                        bookingStatus: editForm.bookingStatus,
                        paymentStatus: editForm.paymentStatus,
                      },
                    });
                    setOpen(false);
                  }}
                  disabled={update.isPending}
                  aria-busy={update.isPending}
                >
                  {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {update.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

