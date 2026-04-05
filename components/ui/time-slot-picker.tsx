"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface TimeSlotPickerProps {
  selectedTime?: string;
  onSelectTime?: (time: string) => void;
  availableSlots?: string[];
  startHour?: number;
  endHour?: number;
  intervalMinutes?: number;
  className?: string;
}

export function TimeSlotPicker({
  selectedTime,
  onSelectTime,
  availableSlots = [],
  startHour = 8,
  endHour = 22,
  intervalMinutes = 60,
  className,
}: TimeSlotPickerProps) {
  const generateTimeSlots = () => {
    const slots: TimeSlot[] = [];
    const totalMinutes = (endHour - startHour) * 60;
    const numSlots = Math.floor(totalMinutes / intervalMinutes);

    for (let i = 0; i <= numSlots; i++) {
      const minutes = startHour * 60 + i * intervalMinutes;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
      
      slots.push({
        time: timeString,
        available: availableSlots.length === 0 || availableSlots.includes(timeString),
      });
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium">Select Time</label>
      <div className="scrollbar-app grid grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 border rounded-lg">
        {timeSlots.map((slot) => {
          const isSelected = selectedTime === slot.time;
          const isDisabled = !slot.available;

          return (
            <button
              key={slot.time}
              type="button"
              onClick={() => !isDisabled && onSelectTime?.(slot.time)}
              disabled={isDisabled}
              className={cn(
                "px-3 py-2 text-sm rounded-md transition-all",
                "hover:bg-blue-50 hover:border-blue-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary-hover border-primary",
                !isSelected && !isDisabled && "border border-gray-200 bg-white",
                isDisabled && "opacity-50 cursor-not-allowed bg-gray-100 border-gray-200"
              )}
            >
              {slot.time}
            </button>
          );
        })}
      </div>
      {availableSlots.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {timeSlots.filter((s) => s.available).length} available slots
        </p>
      )}
    </div>
  );
}
