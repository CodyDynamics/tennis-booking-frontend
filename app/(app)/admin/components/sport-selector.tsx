"use client";

import { useAdmin } from "../admin-context";
import { useSports } from "@/lib/queries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const SPORT_EMOJI: Record<string, string> = { tennis: "🎾", pickleball: "🏓" };

export function SportSelector() {
  const { sport, setSport } = useAdmin();
  const { data: sports = [] } = useSports();

  const value = sports.some((s) => s.code === sport) ? sport : sports[0]?.code ?? "tennis";

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Sport</Label>
      <Select
        value={value}
        onValueChange={(v) => setSport(v)}
      >
        <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-800 border-0 focus:ring-2 focus:ring-blue-500 rounded-xl h-12">
          <SelectValue placeholder="Select sport" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-slate-100 dark:border-slate-800 shadow-xl">
          {sports.length > 0
            ? sports.map((s) => (
                <SelectItem key={s.id} value={s.code} className="rounded-lg cursor-pointer">
                  <div className="flex items-center">
                    <span className="mr-2 text-xl block">{SPORT_EMOJI[s.code] ?? "•"}</span>
                    <span className="font-medium">{s.name}</span>
                  </div>
                </SelectItem>
              ))
            : [
                { code: "tennis", name: "Tennis" },
                { code: "pickleball", name: "Pickleball" },
              ].map((s) => (
                <SelectItem key={s.code} value={s.code} className="rounded-lg cursor-pointer">
                  <div className="flex items-center">
                    <span className="mr-2 text-xl block">{SPORT_EMOJI[s.code] ?? "•"}</span>
                    <span className="font-medium">{s.name}</span>
                  </div>
                </SelectItem>
              ))}
        </SelectContent>
      </Select>
    </div>
  );
}
