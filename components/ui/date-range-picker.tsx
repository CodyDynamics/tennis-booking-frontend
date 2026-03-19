"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  isAfter,
  isBefore,
} from "date-fns";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  selectedRange?: DateRange;
  onSelectRange?: (range: DateRange) => void;
  disabledDates?: Date[];
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export function DateRangePicker({
  selectedRange,
  onSelectRange,
  disabledDates = [],
  minDate,
  maxDate,
  className,
}: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [hoveredDate, setHoveredDate] = React.useState<Date | undefined>();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = monthStart.getDay();
  const daysBeforeMonth = Array.from({ length: firstDayOfWeek }, (_, i) => null);

  const isDateDisabled = (date: Date) => {
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isAfter(date, maxDate)) return true;
    return disabledDates.some((disabledDate) => isSameDay(disabledDate, date));
  };

  const isInRange = (date: Date) => {
    if (!selectedRange?.from) return false;
    if (selectedRange.to) {
      return (
        (isAfter(date, selectedRange.from) || isSameDay(date, selectedRange.from)) &&
        (isBefore(date, selectedRange.to) || isSameDay(date, selectedRange.to))
      );
    }
    if (hoveredDate && selectedRange.from) {
      const from = isBefore(selectedRange.from, hoveredDate)
        ? selectedRange.from
        : hoveredDate;
      const to = isAfter(selectedRange.from, hoveredDate)
        ? selectedRange.from
        : hoveredDate;
      return (
        (isAfter(date, from) || isSameDay(date, from)) &&
        (isBefore(date, to) || isSameDay(date, to))
      );
    }
    return isSameDay(date, selectedRange.from);
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;

    if (!selectedRange?.from || (selectedRange.from && selectedRange.to)) {
      onSelectRange?.({ from: date, to: undefined });
    } else if (selectedRange.from && !selectedRange.to) {
      if (isBefore(date, selectedRange.from)) {
        onSelectRange?.({ from: date, to: selectedRange.from });
      } else {
        onSelectRange?.({ from: selectedRange.from, to: date });
      }
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/15 bg-gradient-to-b from-card to-muted/30 p-5 shadow-soft",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 text-center">
          <CalendarRange className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-base font-bold tracking-tight text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="p-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {daysBeforeMonth.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}
        {daysInMonth.map((day) => {
          const disabled = isDateDisabled(day);
          const isFrom = selectedRange?.from && isSameDay(day, selectedRange.from);
          const isTo = selectedRange?.to && isSameDay(day, selectedRange.to);
          const inRange = isInRange(day);
          const today = isToday(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDateClick(day)}
              onMouseEnter={() => setHoveredDate(day)}
              disabled={disabled}
              className={cn(
                "aspect-square rounded-xl text-sm font-medium transition-all relative",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                disabled && "opacity-40 cursor-not-allowed",
                isFrom &&
                  "bg-primary text-primary-foreground shadow-md scale-[1.02] z-[1] font-bold",
                isTo &&
                  "bg-primary text-primary-foreground shadow-md scale-[1.02] z-[1] font-bold",
                inRange && !isFrom && !isTo && "bg-primary/15 text-primary font-semibold",
                today &&
                  !isFrom &&
                  !isTo &&
                  !inRange &&
                  "bg-primary/10 text-primary font-bold ring-1 ring-primary/30",
                !disabled &&
                  !isFrom &&
                  !isTo &&
                  !inRange &&
                  !today &&
                  "hover:bg-primary/10 hover:text-primary"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {selectedRange?.from && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground font-medium">Your dates</span>
            <span className="font-bold text-foreground">
              {format(selectedRange.from, "MMM d")}
              {selectedRange.to && ` → ${format(selectedRange.to, "MMM d, yyyy")}`}
              {!selectedRange.to && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (pick end date)
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
