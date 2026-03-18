"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CourtCard } from "@/features/courts/components/court-card";
import { CourtBookingModal } from "@/features/courts/components/court-booking-modal";
import { useCourts, useBranches } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Court } from "@/types";
import { Search, MapPin, ArrowLeft, Building2 } from "lucide-react";

export default function CourtsPage() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "indoor" | "outdoor" | "tennis" | "pickleball">("all");

  const { data: locations = [], isLoading: loadingLocations } = useBranches();
  const { data: courts = [], isLoading: loadingCourts } = useCourts({
    branchId: selectedLocation || undefined
  });

  const handleBook = (court: Court) => {
    setSelectedCourt(court);
    setIsModalOpen(true);
  };

  const filteredCourts = courts.filter((court) => {
    const matchesSearch = court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      court.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // As mock, if filter is tennis or pickleball, just mock filter by name if actual type doesn't exist
    let matchesType = true;
    if (filterType === "indoor" || filterType === "outdoor") {
       matchesType = court.type === filterType;
    } else if (filterType === "tennis") {
       matchesType = court.name.toLowerCase().includes("tennis") || (court.description?.toLowerCase().includes("tennis") ?? false) || !court.name.toLowerCase().includes("pickleball");
    } else if (filterType === "pickleball") {
       matchesType = court.name.toLowerCase().includes("pickle") || (court.description?.toLowerCase().includes("pickle") ?? false);
    }
    
    return matchesSearch && matchesType;
  });

  const isLoading = Boolean(loadingLocations || (selectedLocation && loadingCourts));

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground animate-pulse">Loading sports facilities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-7xl">
      <AnimatePresence mode="wait">
        {!selectedLocation ? (
          <motion.div
            key="locations-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                Find Your Playground
              </h1>
              <p className="text-muted-foreground text-xl">
                Choose a location to discover premium tennis and pickleball courts near you.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {locations.map((loc, index) => (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative overflow-hidden rounded-2xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 dark:border-slate-800"
                  onClick={() => setSelectedLocation(loc.id)}
                >
                  <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                    <Building2 className="w-20 h-20 text-slate-300 dark:text-slate-700 group-hover:text-blue-500 transition-colors duration-300" />
                  </div>
                  <div className="p-6 bg-white dark:bg-slate-950">
                    <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-600 transition-colors">{loc.name}</h3>
                    <div className="flex items-center text-muted-foreground text-sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{loc.address || "Main Facility"}</span>
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="courts-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
              <div>
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedLocation(null)}
                  className="mb-4 hover:bg-slate-100 dark:hover:bg-slate-800 -ml-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Locations
                </Button>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  {locations.find(l => l.id === selectedLocation)?.name} Courts
                </h1>
                <p className="text-muted-foreground text-lg mt-2">Book your preferred court for your next game</p>
              </div>
            </div>

            <div className="mb-8 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search courts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-md bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Button variant={filterType === "all" ? "default" : "outline"} onClick={() => setFilterType("all")} className="rounded-full">All</Button>
                <Button variant={filterType === "tennis" ? "default" : "outline"} onClick={() => setFilterType("tennis")} className="rounded-full">Tennis</Button>
                <Button variant={filterType === "pickleball" ? "default" : "outline"} onClick={() => setFilterType("pickleball")} className="rounded-full">Pickleball</Button>
                <div className="w-px h-8 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                <Button variant={filterType === "indoor" ? "default" : "outline"} onClick={() => setFilterType("indoor")} className="rounded-full">Indoor</Button>
                <Button variant={filterType === "outdoor" ? "default" : "outline"} onClick={() => setFilterType("outdoor")} className="rounded-full">Outdoor</Button>
              </div>
            </div>
            
            {filteredCourts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredCourts.map((court, index) => (
                  <CourtCard key={court.id} court={court} onBook={handleBook} index={index} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"
              >
                <div className="w-24 h-24 mx-auto mb-6 opacity-20 relative">
                  <Search className="w-full h-full" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No Courts Found</h3>
                <p className="text-muted-foreground text-lg max-w-md mx-auto">
                  We couldn't find any courts matching your current filters. Try selecting a different sport type or clear your search.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-6 rounded-full px-8"
                  onClick={() => { setSearchQuery(""); setFilterType("all"); }}
                >
                  Clear Filters
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isModalOpen && (
        <CourtBookingModal
          court={selectedCourt}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}
    </div>
  );
}
