"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardDrilldownRow = {
  id: string;
  primary: string;
  secondary?: string;
  tertiary?: string;
  right?: string;
};

export function DashboardDrilldownDialog({
  open,
  onOpenChange,
  title,
  description,
  loading,
  error,
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  emptyMessage = "No rows for this page.",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  rows: DashboardDrilldownRow[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  emptyMessage?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0 pr-10">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {loading && (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {!loading && error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-6">{emptyMessage}</p>
          )}
          {!loading && !error && rows.length > 0 && (
            <ul className="scrollbar-app max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {r.primary}
                      </p>
                      {r.secondary ? (
                        <p className="text-xs text-muted-foreground truncate">{r.secondary}</p>
                      ) : null}
                      {r.tertiary ? (
                        <p className="text-xs text-muted-foreground/90 mt-0.5">{r.tertiary}</p>
                      ) : null}
                    </div>
                    {r.right ? (
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                        {r.right}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loading && !error && total > 0 && (
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-muted-foreground dark:border-slate-800",
              )}
            >
              <span>
                {from}–{to} of {total.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 0}
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount - 1}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
