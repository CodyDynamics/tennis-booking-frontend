"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Court } from "@/types";
import { formatCurrency } from "@/lib/format";
import { Calendar, MapPin, CheckCircle2, XCircle } from "lucide-react";

interface CourtCardProps {
  court: Court;
  onBook: (court: Court) => void;
  index?: number;
}

export function CourtCard({ court, onBook, index = 0 }: CourtCardProps) {
  const isPickleball = court.name.toLowerCase().includes("pickle") || court.description?.toLowerCase().includes("pickle");
  const bgGradient = isPickleball 
    ? "from-emerald-400 to-teal-600"
    : "from-blue-500 to-indigo-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
      className="group relative h-full flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden"
    >
      <div className={`relative h-56 bg-gradient-to-br ${bgGradient} p-6 overflow-hidden flex flex-col justify-between`}>
        {/* Abstract shapes for decoration */}
        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 rounded-full bg-white/10 blur-2xl transform group-hover:scale-150 transition-transform duration-700"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 rounded-full bg-black/10 blur-xl"></div>
        
        <div className="relative z-10 flex justify-between items-start">
          <Badge 
            className={`px-3 py-1 text-xs font-semibold backdrop-blur-md bg-white/20 border-white/30 text-white flex items-center gap-1 ${court.status === "active" ? "" : "opacity-80"}`}
          >
            {court.status === "active" ? (
              <><CheckCircle2 className="h-3 w-3" /> Available</>
            ) : (
              <><XCircle className="h-3 w-3" /> Maintenance</>
            )}
          </Badge>
          <Badge variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-md capitalize">
            {court.type}
          </Badge>
        </div>

        <div className="relative z-10 mt-auto">
          <h3 className="text-3xl font-black text-white leading-tight drop-shadow-md mb-1">{court.name}</h3>
          <div className="flex items-center text-white/90 text-sm font-medium">
            <MapPin className="h-4 w-4 mr-1 opacity-70" />
            {isPickleball ? "Pickleball Court" : "Tennis Court"}
          </div>
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pricing</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(Number(court.pricePerHour))}
              </span>
              <span className="text-sm text-slate-500">/hr</span>
            </div>
          </div>
        </div>
        
        {court.description && (
          <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-2 mb-6 flex-1">
            {court.description}
          </p>
        )}
        
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button 
            onClick={() => onBook(court)} 
            className={`w-full h-12 text-md rounded-xl font-bold shadow-lg transition-transform ${isPickleball ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 text-white'} group-hover:scale-[1.02] active:scale-95`}
            disabled={court.status !== "active"}
          >
            <Calendar className="mr-2 h-5 w-5" />
            Book Now
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
