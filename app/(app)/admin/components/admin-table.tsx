"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export interface AdminTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  headClassName?: string;
  /** When set with `onColumnSort`, header becomes a sort control. */
  sortable?: boolean;
}

interface AdminTableProps<T> {
  data: T[];
  columns: AdminTableColumn<T>[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  loadingNode?: React.ReactNode;
  className?: string;
  /** Active sort column key (must match a sortable column). */
  sortKey?: string | null;
  sortDir?: "asc" | "desc";
  /** Called when a sortable column header is clicked (parent toggles asc/desc/off). */
  onColumnSort?: (columnKey: string) => void;
}

export function AdminTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = "No data found.",
  isLoading,
  loadingNode,
  className,
  sortKey = null,
  sortDir = "asc",
  onColumnSort,
}: AdminTableProps<T>) {
  if (isLoading && loadingNode) {
    return <>{loadingNode}</>;
  }

  return (
    <div className={cn("overflow-x-auto rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn("font-bold text-slate-700 dark:text-slate-200", col.headClassName)}
              >
                {col.sortable && onColumnSort ? (
                  <button
                    type="button"
                    className={cn(
                      "-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left hover:bg-muted/80",
                      sortKey === col.key && "text-primary",
                    )}
                    onClick={() => onColumnSort(col.key)}
                  >
                    <span>{col.label}</span>
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={keyExtractor(row)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render
                      ? col.render(row)
                      : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
