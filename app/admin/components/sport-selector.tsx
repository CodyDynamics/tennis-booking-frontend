"use client";

import { useAdmin } from "../admin-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function SportSelector() {
  const { sport, setSport } = useAdmin();

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Sport</Label>
      <Select value={sport} onValueChange={(v) => setSport(v as "tennis" | "pickleball")}>
        <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-800 border-0 focus:ring-2 focus:ring-blue-500 rounded-xl h-12">
          <SelectValue placeholder="Select sport" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-slate-100 dark:border-slate-800 shadow-xl">
          <SelectItem value="tennis" className="rounded-lg cursor-pointer">
            <div className="flex items-center">
              <span className="mr-2 text-xl block">🎾</span>
              <span className="font-medium">Tennis</span>
            </div>
          </SelectItem>
          <SelectItem value="pickleball" className="rounded-lg cursor-pointer">
            <div className="flex items-center">
              <span className="mr-2 text-xl block">🏓</span>
              <span className="font-medium">Pickleball</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
