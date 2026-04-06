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
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";

interface CalendarProps {
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  disabledDates?: Date[];
  minDate?: Date;
  maxDate?: Date;
  /** Extra rule (e.g. disable past dates in venue timezone). Checked after min/max. */
  isDateDisabled?: (date: Date) => boolean;
  className?: string;
  /** ~2/3 visual scale of default (tighter padding & type) for dense layouts. */
  size?: "default" | "compact";
  /**
   * Controlled month (any day in the month). Use with `onVisibleMonthChange` for multi-month sidebars
   * so navigating months does not follow `selectedDate`.
   */
  visibleMonth?: Date;
  onVisibleMonthChange?: (month: Date) => void;
}

export function Calendar({
  selectedDate,
  onSelectDate,
  disabledDates = [],
  minDate,
  maxDate,
  isDateDisabled,
  className,
  size = "default",
  visibleMonth: visibleMonthProp,
  onVisibleMonthChange,
}: CalendarProps) {
  const compact = size === "compact";
  const monthControlled =
    visibleMonthProp != null && onVisibleMonthChange != null;
  const [internalMonth, setInternalMonth] = React.useState(() =>
    visibleMonthProp ? startOfMonth(visibleMonthProp) : new Date(),
  );

  React.useEffect(() => {
    if (monthControlled) return;
    if (selectedDate) {
      setInternalMonth(startOfMonth(selectedDate));
    }
  }, [selectedDate, monthControlled]);

  React.useEffect(() => {
    if (!monthControlled && visibleMonthProp) {
      setInternalMonth(startOfMonth(visibleMonthProp));
    }
  }, [visibleMonthProp, monthControlled]);

  const displayMonth = monthControlled
    ? startOfMonth(visibleMonthProp)
    : internalMonth;

  const goPrevMonth = () => {
    const next = subMonths(displayMonth, 1);
    if (monthControlled) onVisibleMonthChange!(next);
    else setInternalMonth(next);
  };

  const goNextMonth = () => {
    const next = addMonths(displayMonth, 1);
    if (monthControlled) onVisibleMonthChange!(next);
    else setInternalMonth(next);
  };

  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(displayMonth);
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
    <div
      className={cn(
        "rounded-lg border bg-card shadow-soft",
        compact ? "p-2" : "p-4",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between",
          compact ? "mb-1.5" : "mb-4",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className={cn(compact && "h-7 w-7")}
          onClick={goPrevMonth}
        >
          <ChevronLeft className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </Button>
        <h3
          className={cn(
            "font-semibold",
            compact ? "text-sm" : "text-lg",
          )}
        >
          {format(displayMonth, "MMMM yyyy")}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className={cn(compact && "h-7 w-7")}
          onClick={goNextMonth}
        >
          <ChevronRight className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </Button>
      </div>

      <div
        className={cn(
          "grid grid-cols-7",
          compact ? "gap-0.5 mb-1" : "gap-1 mb-2",
        )}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className={cn(
              "text-center font-medium text-muted-foreground",
              compact ? "text-[10px] p-0.5 sm:text-xs" : "text-sm p-2",
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className={cn("grid grid-cols-7", compact ? "gap-0.5" : "gap-1")}>
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
                "aspect-square rounded-md transition-colors",
                compact ? "text-xs" : "text-sm",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                disabled && "opacity-50 cursor-not-allowed",
                selected && "bg-primary text-primary-foreground hover:bg-primary-hover",
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
