"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import type { AdminSportDrilldownItemApi } from "@/types/api";
import { PaginatedTableDialog, type PaginatedTableColumn } from "@/components/admin/paginated-table-dialog";
import { DynamicAnalyticsDialog } from "@/components/admin/dynamic-analytics-dialog";
import { buildBookerAnalyticsBlocks } from "@/lib/admin-booker-analytics";
import { formatPhoneDisplay } from "@/lib/us-phone";
import { Button } from "@/components/ui/button";
import { titleCaseFilterLabel } from "@/lib/format";

export type SportBookerTableRow = AdminSportDrilldownItemApi & { id: string };

function toRows(items: AdminSportDrilldownItemApi[]): SportBookerTableRow[] {
  return items.map((u) => ({ ...u, id: u.userId }));
}

export function SportBookersDrilldownDialog({
  open,
  onOpenChange,
  title,
  description,
  loading,
  error,
  items,
  total,
  page,
  pageSize,
  onPageChange,
  sportKey,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  items: AdminSportDrilldownItemApi[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  /** Sport segment key for demo analytics (e.g. tennis). */
  sportKey: string;
}) {
  const [analyticsUser, setAnalyticsUser] = useState<AdminSportDrilldownItemApi | null>(null);

  useEffect(() => {
    if (!open) setAnalyticsUser(null);
  }, [open]);

  const rows = useMemo(() => toRows(items), [items]);

  const columns: PaginatedTableColumn<SportBookerTableRow>[] = useMemo(
    () => [
      {
        key: "user",
        label: "User",
        render: (u) => (
          <div className="min-w-[140px] max-w-[220px]">
            <p className="truncate font-medium text-foreground">{u.fullName?.trim() || "—"}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        ),
      },
      {
        key: "phone",
        label: "Phone",
        className: "tabular-nums text-sm",
        render: (u) => (u.phone ? formatPhoneDisplay(u.phone) : "—"),
      },
      {
        key: "homeAddress",
        label: "Address",
        className: "max-w-[200px] text-sm",
        render: (u) => <span className="line-clamp-2">{u.homeAddress?.trim() || "—"}</span>,
      },
      {
        key: "primaryCourtName",
        label: "Court name",
        className: "max-w-[180px] text-sm",
        render: (u) => <span className="line-clamp-2">{u.primaryCourtName?.trim() || "—"}</span>,
      },
      {
        key: "bookingCount",
        label: "Bookings",
        headClassName: "text-right",
        className: "text-right tabular-nums font-medium",
        render: (u) => u.bookingCount.toLocaleString(),
      },
      {
        key: "analytics",
        label: "Analytics",
        headClassName: "text-center w-[100px]",
        className: "text-center",
        render: (u) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setAnalyticsUser(u)}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </Button>
        ),
      },
    ],
    [],
  );

  const analyticsBlocks = useMemo(() => {
    if (!analyticsUser) return [];
    return buildBookerAnalyticsBlocks({
      userId: analyticsUser.userId,
      email: analyticsUser.email,
      sport: sportKey,
      bookingCount: analyticsUser.bookingCount,
    });
  }, [analyticsUser, sportKey]);

  const analyticsTitle = analyticsUser
    ? `Analytics · ${analyticsUser.fullName?.trim() || analyticsUser.email}`
    : "Analytics";

  return (
    <>
      <PaginatedTableDialog<SportBookerTableRow>
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        loading={loading}
        error={error}
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        emptyMessage="No bookers match this segment."
      />
      <DynamicAnalyticsDialog
        open={Boolean(analyticsUser)}
        onOpenChange={(v) => {
          if (!v) setAnalyticsUser(null);
        }}
        title={analyticsTitle}
        description={
          analyticsUser
            ? `${analyticsUser.email} · ${titleCaseFilterLabel(sportKey)} · ${analyticsUser.bookingCount.toLocaleString()} bookings in window`
            : undefined
        }
        blocks={analyticsBlocks}
      />
    </>
  );
}
