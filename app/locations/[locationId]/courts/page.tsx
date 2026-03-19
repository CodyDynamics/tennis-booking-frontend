"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { CourtCard } from "@/features/courts/components/court-card";
import { useCourts, useLocation } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function LocationCourtsPage() {
  const params = useParams();
  const locationId = params.locationId as string;
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "indoor" | "outdoor" | "tennis" | "pickleball"
  >("all");

  const { data: location, isLoading: loadingLocation } = useLocation(locationId);
  const { data: courts = [], isLoading: loadingCourts } = useCourts({
    locationId: locationId || undefined,
  });

  const filteredCourts = courts.filter((court) => {
    const matchesSearch =
      court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      court.description?.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesType = true;
    if (filterType === "indoor" || filterType === "outdoor") {
      matchesType = court.type === filterType;
    } else if (filterType === "tennis") {
      matchesType =
        court.name.toLowerCase().includes("tennis") ||
        (court.description?.toLowerCase().includes("tennis") ?? false) ||
        !court.name.toLowerCase().includes("pickleball");
    } else if (filterType === "pickleball") {
      matchesType =
        court.name.toLowerCase().includes("pickle") ||
        (court.description?.toLowerCase().includes("pickle") ?? false);
    }
    return matchesSearch && matchesType;
  });

  const isLoading = loadingLocation || loadingCourts;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground animate-pulse">Loading courts...</p>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-7xl text-center">
        <p className="text-muted-foreground">Location not found.</p>
        <Link href="/">
          <Button variant="outline" className="mt-4 rounded-full">
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link href="/">
              <Button
                variant="ghost"
                className="mb-4 hover:bg-slate-100 dark:hover:bg-slate-800 -ml-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </Link>
            <h1 className="text-4xl font-bold text-foreground">
              {location.name} — Courts
            </h1>
            <p className="text-muted-foreground text-lg mt-2">
              Court info at this location
            </p>
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
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
              className="rounded-full"
            >
              All
            </Button>
            <Button
              variant={filterType === "tennis" ? "default" : "outline"}
              onClick={() => setFilterType("tennis")}
              className="rounded-full"
            >
              Tennis
            </Button>
            <Button
              variant={filterType === "pickleball" ? "default" : "outline"}
              onClick={() => setFilterType("pickleball")}
              className="rounded-full"
            >
              Pickleball
            </Button>
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-700 mx-1" />
            <Button
              variant={filterType === "indoor" ? "default" : "outline"}
              onClick={() => setFilterType("indoor")}
              className="rounded-full"
            >
              Indoor
            </Button>
            <Button
              variant={filterType === "outdoor" ? "default" : "outline"}
              onClick={() => setFilterType("outdoor")}
              className="rounded-full"
            >
              Outdoor
            </Button>
          </div>
        </div>

        {filteredCourts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredCourts.map((court, index) => (
              <CourtCard
                key={court.id}
                court={court}
                index={index}
                showBooking={false}
                detailHref={`/locations/${locationId}/courts/${court.id}`}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"
          >
            <h3 className="text-2xl font-bold mb-2">No Courts Found</h3>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              No courts at this location match your filters.
            </p>
            <Button
              variant="outline"
              className="mt-6 rounded-full px-8"
              onClick={() => {
                setSearchQuery("");
                setFilterType("all");
              }}
            >
              Clear Filters
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
