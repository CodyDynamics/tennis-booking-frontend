"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseLocalYmd(s: string): Date | undefined {
  const t = s?.trim();
  if (!t) return undefined;
  const parts = t.split("-").map((x) => Number(x));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return undefined;
  const [y, m, d] = parts;
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return undefined;
  }
  return date;
}

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DatePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Shown when `value` is empty. */
  placeholder?: string;
  "aria-label"?: string;
  /** Show a clear control (for optional dates). */
  allowClear?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePickerField({
  value,
  onChange,
  disabled,
  id,
  className,
  placeholder = "Pick a date",
  "aria-label": ariaLabel,
  allowClear,
  minDate,
  maxDate,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseLocalYmd(value);

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
          aria-label={ariaLabel}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          {selected ? format(selected, "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          className="border-0 shadow-none"
          selectedDate={selected}
          minDate={minDate}
          maxDate={maxDate}
          onSelectDate={(d) => {
            onChange(toLocalYmd(d));
            setOpen(false);
          }}
        />
        {allowClear && Boolean(value.trim()) && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full text-muted-foreground"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
