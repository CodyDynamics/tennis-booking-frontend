"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface TimeRangePickerProps {
  fromTime?: string;
  toTime?: string;
  onFromTimeChange?: (time: string) => void;
  onToTimeChange?: (time: string | undefined) => void;
  startHour?: number;
  endHour?: number;
  intervalMinutes?: number;
  className?: string;
}

export function TimeRangePicker({
  fromTime,
  toTime,
  onFromTimeChange,
  onToTimeChange,
  startHour = 8,
  endHour = 22,
  intervalMinutes = 60,
  className,
}: TimeRangePickerProps) {
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const totalMinutes = (endHour - startHour) * 60;
    const numSlots = Math.floor(totalMinutes / intervalMinutes);

    for (let i = 0; i <= numSlots; i++) {
      const minutes = startHour * 60 + i * intervalMinutes;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
      slots.push(timeString);
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  const handleTimeClick = (time: string) => {
    if (!fromTime) {
      // Select start time
      onFromTimeChange?.(time);
    } else if (!toTime) {
      // Select end time
      const fromHour = parseInt(fromTime.split(":")[0]);
      const toHour = parseInt(time.split(":")[0]);
      
      if (toHour <= fromHour) {
        // If clicked time is before or equal to start, reset and set new start
        onFromTimeChange?.(time);
        onToTimeChange?.(undefined as any);
      } else {
        // Set end time
        onToTimeChange?.(time);
      }
    } else {
      // Reset and start new selection
      onFromTimeChange?.(time);
      onToTimeChange?.(undefined as any);
    }
  };

  const isInRange = (time: string) => {
    if (!fromTime || !toTime) return false;
    const timeHour = parseInt(time.split(":")[0]);
    const fromHour = parseInt(fromTime.split(":")[0]);
    const toHour = parseInt(toTime.split(":")[0]);
    return timeHour > fromHour && timeHour < toHour;
  };

  const isStartTime = (time: string) => time === fromTime;
  const isEndTime = (time: string) => time === toTime;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Select Time Range</Label>
        {fromTime && toTime && (
          <span className="text-sm text-muted-foreground">
            {fromTime} - {toTime}
          </span>
        )}
      </div>
      <div className="scrollbar-app grid grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 border rounded-lg bg-gray-50/50">
        {timeSlots.map((time) => {
          const inRange = isInRange(time);
          const isStart = isStartTime(time);
          const isEnd = isEndTime(time);
          const isSelected = isStart || isEnd;

          return (
            <button
              key={time}
              type="button"
              onClick={() => handleTimeClick(time)}
              className={cn(
                "px-3 py-2 text-sm rounded-md transition-all font-medium",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                isStart && "bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-700",
                isEnd && "bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-700",
                inRange && !isSelected && "bg-blue-100 text-blue-700 border border-blue-300",
                !isStart && !isEnd && !inRange && "border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 text-gray-700"
              )}
            >
              {time}
            </button>
          );
        })}
      </div>
      {!fromTime && (
        <p className="text-xs text-muted-foreground">Click a time to select start time</p>
      )}
      {fromTime && !toTime && (
        <p className="text-xs text-muted-foreground">Click a later time to select end time</p>
      )}
    </div>
  );
}
