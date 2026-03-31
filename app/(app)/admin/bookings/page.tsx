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

const PAGE_SIZE = 20;

const BOOKING_STATUS = ["pending", "confirmed", "cancelled", "completed"] as const;
const PAYMENT_STATUS = ["unpaid", "paid", "refunded"] as const;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function AdminBookingsPage() {
  const { locationId: adminLocationId } = useAdmin();
  const { data: locations = [] } = useLocations();

  const [search, setSearch] = useState("");
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
    search: search || undefined,
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

  useEffect(() => setPage(1), [search, status, paymentStatus, from, to, adminLocationId]);

  const paginated = useMemo(
    () => rowsForUi.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rowsForUi, page],
  );

  const locationNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations) m.set(l.id, l.name);
    return m;
  }, [locations]);

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
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Booking status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {BOOKING_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Payment</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {PAYMENT_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </AdminFilter>

      <Card>
        <CardContent className="pt-6">
          <AdminTable<AdminCourtBookingRowApi>
            data={paginated}
            keyExtractor={(r) => r.id}
            emptyMessage="No bookings match your filters."
            isLoading={isLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              { key: "date", label: "Date", render: (r) => String(r.bookingDate).slice(0, 10) },
              { key: "time", label: "Time", render: (r) => `${r.startTime}–${r.endTime}` },
              { key: "court", label: "Court", render: (r) => r.court?.name ?? r.courtId },
              {
                key: "user",
                label: "User",
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
                render: (r) =>
                  r.location?.name ??
                  (r.locationId ? locationNameById.get(r.locationId) ?? r.locationId : "—"),
              },
              { key: "sport", label: "Sport", render: (r) => r.sport ?? "—" },
              { key: "courtType", label: "Env", render: (r) => r.courtType ?? "—" },
              { key: "payment", label: "Payment", render: (r) => r.paymentStatus },
              { key: "status", label: "Status", render: (r) => r.bookingStatus },
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
              } as any,
            ]}
          />

          {!isLoading && rowsForUi.length > 0 && (
            <AdminPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={rowsForUi.length}
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
                  {String(editing.bookingDate).slice(0, 10)} {editing.startTime}–{editing.endTime}
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

