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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export function LocationScopeSelector({ compact = false }: { compact?: boolean }) {
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

  const selectedLabel =
    value === "all"
      ? "All locations"
      : options.find((l) => l.id === value)?.name ?? "Location";

  /** Collapsed sidebar: icon-only control — Radix Select always renders the value label in the trigger, which truncates badly (e.g. "Te…"). */
  if (compact) {
    return (
      <div className="flex w-full justify-center px-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "h-12 w-full rounded-xl px-0 text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900",
                "dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
              )}
              title={`Location: ${selectedLabel}`}
              aria-label={`Location scope, ${selectedLabel}. Open menu to change.`}
            >
              <MapPin className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            sideOffset={8}
            className="z-[80] max-h-[min(320px,50vh)] w-[min(100vw-2rem,280px)] overflow-y-auto rounded-xl border-slate-200 p-1 shadow-xl dark:border-slate-800"
          >
            <DropdownMenuItem
              className="cursor-pointer rounded-lg px-3 py-2.5"
              onClick={() => setLocationId("all")}
            >
              <span className="mr-2 flex w-4 shrink-0 justify-center">
                {value === "all" ? <Check className="h-4 w-4 text-primary" /> : null}
              </span>
              <span className="font-medium">All locations</span>
            </DropdownMenuItem>
            {options.map((loc) => (
              <DropdownMenuItem
                key={loc.id}
                className="cursor-pointer rounded-lg px-3 py-2.5"
                onClick={() => setLocationId(loc.id)}
              >
                <span className="mr-2 flex w-4 shrink-0 justify-center">
                  {value === loc.id ? <Check className="h-4 w-4 text-primary" /> : null}
                </span>
                <span className="font-medium">{loc.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Location
      </Label>
      <div className="flex items-stretch gap-2">
        <div
          className="flex w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80"
          aria-hidden
        >
          <MapPin className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <Select value={value} onValueChange={setLocationId}>
            <SelectTrigger className="h-12 w-full rounded-xl border-0 bg-slate-50 px-3 focus:ring-2 focus:ring-primary dark:bg-slate-800">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(320px,50vh)] rounded-xl border-slate-100 shadow-xl dark:border-slate-800">
              <SelectItem value="all" className="cursor-pointer rounded-lg">
                All locations
              </SelectItem>
              {options.map((loc) => (
                <SelectItem key={loc.id} value={loc.id} className="cursor-pointer rounded-lg">
                  <span className="font-medium">{loc.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
