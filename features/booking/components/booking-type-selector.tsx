"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { BookingType } from "@/types";
import { Square, User, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingTypeSelectorProps {
  value: BookingType;
  onChange: (value: BookingType) => void;
}

const OPTIONS: {
  value: BookingType;
  id: string;
  title: string;
  description: string;
  icon: typeof Square;
}[] = [
  {
    value: "COURT_ONLY",
    id: "court-only",
    title: "Court only",
    description: "Casual play — no coach",
    icon: Square,
  },
  {
    value: "COURT_COACH",
    id: "court-coach",
    title: "Court + coach",
    description: "Guided session on court",
    icon: User,
  },
  {
    value: "TRAINING",
    id: "training",
    title: "Training",
    description: "Structured lesson (students)",
    icon: Users,
  },
];

export function BookingTypeSelector({ value, onChange }: BookingTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <Label className="text-base font-bold text-foreground">How do you want to play?</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Pick one option — you can add a coach below if needed</p>
        </div>
      </div>

      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as BookingType)}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {OPTIONS.map(({ value: optValue, id, title, description, icon: Icon }) => {
          const selected = value === optValue;
          return (
            <label
              key={id}
              htmlFor={id}
              className={cn(
                "relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200",
                "hover:border-primary/40 hover:bg-primary/[0.03] hover:shadow-md",
                selected
                  ? "border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-brand ring-1 ring-primary/20"
                  : "border-border bg-card"
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                    selected ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground leading-tight">{title}</span>
                    <RadioGroupItem value={optValue} id={id} className="shrink-0 border-2" />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </div>
              {selected && (
                <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden />
              )}
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
