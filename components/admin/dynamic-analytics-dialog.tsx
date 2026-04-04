"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AnalyticsChartBlock } from "@/lib/admin-booker-analytics";
import { cn } from "@/lib/utils";

export type { AnalyticsChartBlock };

export function DynamicAnalyticsDialog({
  open,
  onOpenChange,
  title,
  description,
  blocks,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  blocks: AnalyticsChartBlock[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-4 overflow-hidden sm:max-w-3xl">
        <DialogHeader className="shrink-0 pr-10 text-left sm:text-left">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="scrollbar-app min-h-0 flex-1 space-y-8 overflow-y-auto py-1 pr-1">
          {blocks.map((block) => (
            <section key={block.id} className="space-y-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{block.title}</h3>
                {block.subtitle ? (
                  <p className="text-xs text-muted-foreground">{block.subtitle}</p>
                ) : null}
              </div>
              <div className={cn("h-[220px] w-full rounded-lg border bg-muted/20 p-2")}>
                <ResponsiveContainer width="100%" height="100%">
                  {block.variant === "line" ? (
                    <LineChart data={block.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis width={36} tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12 }}
                        formatter={(v: number) => [v, "Value"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={block.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={56} />
                      <YAxis width={36} tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12 }}
                        formatter={(v: number) => [v, "Bookings"]}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
