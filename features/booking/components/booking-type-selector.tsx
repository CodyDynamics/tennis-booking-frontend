"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { BookingType } from "@/types";
import { Square, User, Users } from "lucide-react";

interface BookingTypeSelectorProps {
  value: BookingType;
  onChange: (value: BookingType) => void;
}

export function BookingTypeSelector({ value, onChange }: BookingTypeSelectorProps) {
  const handleValueChange = (newValue: string) => {
    onChange(newValue as BookingType);
  };

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Booking Type</Label>
      <RadioGroup value={value} onValueChange={handleValueChange} className="space-y-3">
        <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
          <RadioGroupItem value="COURT_ONLY" id="court-only" />
          <Label htmlFor="court-only" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <Square className="h-5 w-5 text-primary" />
              <span className="font-medium">Court Only</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Book court for casual play without coach
            </p>
          </Label>
        </div>

        <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
          <RadioGroupItem value="COURT_COACH" id="court-coach" />
          <Label htmlFor="court-coach" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <span className="font-medium">Court + Coach</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Book court with a coach for guided play
            </p>
          </Label>
        </div>

        <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
          <RadioGroupItem value="TRAINING" id="training" />
          <Label htmlFor="training" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-medium">Training Session</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Structured training session with coach (for students)
            </p>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
