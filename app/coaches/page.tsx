"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CoachCard } from "@/features/coaches/components/coach-card";
import { CoachBookingModal } from "@/features/coaches/components/coach-booking-modal";
import { useCoaches } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import type { Coach } from "@/types";
import { Search } from "lucide-react";

export default function CoachesPage() {
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: coaches = [], isLoading } = useCoaches();

  const handleBook = (coach: Coach) => {
    setSelectedCoach(coach);
    setIsModalOpen(true);
  };

  const filteredCoaches = coaches.filter((coach) => {
    const name = coach.user?.fullName.toLowerCase() || "";
    const bio = coach.bio?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase()) || bio.includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading coaches...</p>
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
        <h1 className="text-4xl font-bold mb-2 text-foreground">
          Available Coaches
        </h1>
        <p className="text-muted-foreground text-lg">Book a session with our professional coaches</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search coaches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>
      
      {filteredCoaches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoaches.map((coach, index) => (
            <CoachCard key={coach.id} coach={coach} onBook={handleBook} index={index} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-muted-foreground text-lg">No coaches found matching your search</p>
        </motion.div>
      )}

      <CoachBookingModal
        coach={selectedCoach}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
