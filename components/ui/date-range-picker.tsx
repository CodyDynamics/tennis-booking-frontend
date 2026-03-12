"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
      // Start new selection
      onSelectRange?.({ from: date, to: undefined });
    } else if (selectedRange.from && !selectedRange.to) {
      // Complete selection
      if (isBefore(date, selectedRange.from)) {
        // If clicked date is before from, swap them
        onSelectRange?.({ from: date, to: selectedRange.from });
      } else {
        onSelectRange?.({ from: selectedRange.from, to: date });
      }
    }
  };

  return (
    <div className={cn("rounded-lg border bg-card p-4 shadow-soft", className)}>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-lg">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
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
              onClick={() => handleDateClick(day)}
              onMouseEnter={() => setHoveredDate(day)}
              disabled={disabled}
              className={cn(
                "aspect-square rounded-md text-sm transition-colors relative",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                disabled && "opacity-50 cursor-not-allowed",
                isFrom &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold",
                isTo &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold",
                inRange && !isFrom && !isTo && "bg-primary/20 text-primary",
                today && !isFrom && !isTo && !inRange && "bg-blue-100 text-blue-900 font-semibold",
                !disabled && !selectedRange?.from && !today && "hover:bg-blue-50"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {selectedRange?.from && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Selected:</span>
            <span className="font-medium">
              {format(selectedRange.from, "MMM dd")}
              {selectedRange.to && ` - ${format(selectedRange.to, "MMM dd")}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
