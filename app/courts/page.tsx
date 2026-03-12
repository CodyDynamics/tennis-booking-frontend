"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CourtCard } from "@/features/courts/components/court-card";
import { CourtBookingModal } from "@/features/courts/components/court-booking-modal";
import { useCourts } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Court } from "@/types";
import { Search } from "lucide-react";

export default function CourtsPage() {
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "indoor" | "outdoor">("all");
  const { data: courts = [], isLoading } = useCourts();

  const handleBook = (court: Court) => {
    setSelectedCourt(court);
    setIsModalOpen(true);
  };

  const filteredCourts = courts.filter((court) => {
    const matchesSearch = court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      court.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || court.type === filterType;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading courts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Available Courts
        </h1>
        <p className="text-muted-foreground text-lg">Book your preferred court for your next game</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        {/* Search on top with higher z-index so dropdown/results are not covered by buttons */}
        <div className="relative z-10 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search courts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {/* Buttons below search, do not overlap content below */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            onClick={() => setFilterType("all")}
          >
            All Types
          </Button>
          <Button
            variant={filterType === "indoor" ? "default" : "outline"}
            onClick={() => setFilterType("indoor")}
          >
            Indoor
          </Button>
          <Button
            variant={filterType === "outdoor" ? "default" : "outline"}
            onClick={() => setFilterType("outdoor")}
          >
            Outdoor
          </Button>
        </div>
      </motion.div>
      
      {filteredCourts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourts.map((court, index) => (
            <CourtCard key={court.id} court={court} onBook={handleBook} index={index} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-muted-foreground text-lg">No courts found matching your criteria</p>
        </motion.div>
      )}

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
