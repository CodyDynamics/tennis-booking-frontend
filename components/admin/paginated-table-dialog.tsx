"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaginatedTableColumn<T> = {
  key: string;
  label: string;
  headClassName?: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
};

export function PaginatedTableDialog<T extends { id: string }>({
  open,
  onOpenChange,
  title,
  description,
  loading,
  error,
  columns,
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  emptyMessage = "No rows for this page.",
  dialogClassName,
  tableWrapperClassName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  columns: PaginatedTableColumn<T>[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  emptyMessage?: string;
  dialogClassName?: string;
  tableWrapperClassName?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[88vh] max-w-[95vw] flex-col gap-0 overflow-hidden sm:max-w-5xl",
          dialogClassName,
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 pr-10 text-left">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 pt-2">
          {loading && (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {!loading && error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && rows.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">{emptyMessage}</p>
          )}
          {!loading && !error && rows.length > 0 && (
            <div
              className={cn(
                "scrollbar-app min-h-0 flex-1 overflow-auto rounded-md border",
                tableWrapperClassName,
              )}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={cn(
                          "whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200",
                          col.headClassName,
                        )}
                      >
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      {columns.map((col) => (
                        <TableCell key={col.key} className={cn("align-top", col.className)}>
                          {col.render
                            ? col.render(row)
                            : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && !error && total > 0 && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
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
