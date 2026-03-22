"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from "date-fns";

interface CalendarProps {
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  disabledDates?: Date[];
  minDate?: Date;
  maxDate?: Date;
  /** Extra rule (e.g. disable past dates in venue timezone). Checked after min/max. */
  isDateDisabled?: (date: Date) => boolean;
  className?: string;
}

export function Calendar({
  selectedDate,
  onSelectDate,
  disabledDates = [],
  minDate,
  maxDate,
  isDateDisabled,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = monthStart.getDay();
  const daysBeforeMonth = Array.from({ length: firstDayOfWeek }, (_, i) => null);

  const checkDisabled = (date: Date) => {
    if (isDateDisabled?.(date)) return true;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return disabledDates.some((disabledDate) => isSameDay(disabledDate, date));
  };

  const handleDateClick = (date: Date) => {
    if (!checkDisabled(date) && onSelectDate) {
      onSelectDate(date);
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
          const disabled = checkDisabled(day);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              disabled={disabled}
              className={cn(
                "aspect-square rounded-md text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                disabled && "opacity-50 cursor-not-allowed",
                selected && "bg-primary text-primary-foreground hover:bg-primary/90",
                today && !selected && "bg-blue-100 text-blue-900 font-semibold",
                !disabled && !selected && !today && "hover:bg-blue-50"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
