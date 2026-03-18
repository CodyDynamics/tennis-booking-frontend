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

export interface AdminTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  headClassName?: string;
}

interface AdminTableProps<T> {
  data: T[];
  columns: AdminTableColumn<T>[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  loadingNode?: React.ReactNode;
  className?: string;
}

export function AdminTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = "No data found.",
  isLoading,
  loadingNode,
  className,
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
              <TableHead key={col.key} className={col.headClassName}>
                {col.label}
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
