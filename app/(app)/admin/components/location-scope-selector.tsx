"use client";

import { useEffect, useRef } from "react";
import { useAdmin, ADMIN_LOCATION_SCOPE_STORAGE_KEY } from "../admin-context";
import { useAuth } from "@/lib/auth-store";
import { useLocations, useBookableLocations } from "@/lib/queries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function LocationScopeSelector() {
  const { user } = useAuth();
  const { locationId, setLocationId } = useAdmin();
  const { data: allLocations = [] } = useLocations();
  const { data: bookableLocs = [] } = useBookableLocations(user?.role === "super_user");

  const options =
    user?.role === "super_user" && bookableLocs.length > 0 ? bookableLocs : allLocations;

  const springparkDefaultApplied = useRef(false);
  useEffect(() => {
    if (springparkDefaultApplied.current || options.length === 0) return;
    const saved = localStorage.getItem(ADMIN_LOCATION_SCOPE_STORAGE_KEY);
    if (saved != null) {
      springparkDefaultApplied.current = true;
      return;
    }
    const sp = options.find((l) => /springpark/i.test(l.name.trim()));
    springparkDefaultApplied.current = true;
    if (sp) setLocationId(sp.id);
  }, [options, setLocationId]);

  const value =
    locationId === "all" || options.some((l) => l.id === locationId)
      ? locationId
      : "all";

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Location
      </Label>
      <Select value={value} onValueChange={setLocationId}>
        <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-800 border-0 focus:ring-2 focus:ring-primary rounded-xl h-12">
          <SelectValue placeholder="All locations" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-slate-100 dark:border-slate-800 shadow-xl max-h-[min(320px,50vh)]">
          <SelectItem value="all" className="rounded-lg cursor-pointer">
            All locations
          </SelectItem>
          {options.map((loc) => (
            <SelectItem key={loc.id} value={loc.id} className="rounded-lg cursor-pointer">
              <span className="font-medium">{loc.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
