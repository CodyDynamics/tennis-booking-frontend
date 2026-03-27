"use client";

import { motion, LayoutGroup } from "framer-motion";
import { Database, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminDataMode = "real" | "mock";

const spring = { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.7 };

export function AdminDataSourceToggle({
  mode,
  onChange,
  className,
}: {
  mode: AdminDataMode;
  onChange: (next: AdminDataMode) => void;
  className?: string;
}) {
  return (
    <LayoutGroup id="admin-dashboard-data-source">
      <div
        className={cn(
          "relative inline-grid grid-cols-2 gap-0 rounded-xl border border-slate-200/90 bg-slate-100 p-1 shadow-inner dark:border-slate-700 dark:bg-slate-950/80",
          "w-[min(100%,280px)]",
          className,
        )}
      >
        <motion.div
          className="pointer-events-none absolute top-1 bottom-1 w-[calc(50%-6px)] rounded-lg bg-white shadow-md ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700"
          initial={false}
          animate={{ left: mode === "real" ? 4 : "calc(50% + 2px)" }}
          transition={spring}
        />
        <motion.button
          type="button"
          onClick={() => onChange("real")}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "relative z-10 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
            mode === "real"
              ? "text-blue-700 dark:text-blue-200"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          <Database className="h-3.5 w-3.5" />
          Real data
        </motion.button>
        <motion.button
          type="button"
          onClick={() => onChange("mock")}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "relative z-10 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
            mode === "mock"
              ? "text-violet-700 dark:text-violet-200"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Mockup
        </motion.button>
      </div>
    </LayoutGroup>
  );
}
