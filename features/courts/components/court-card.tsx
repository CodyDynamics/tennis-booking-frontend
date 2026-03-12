"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Court } from "@/types";
import { Calendar, MapPin, CheckCircle2 } from "lucide-react";
import Image from "next/image";

interface CourtCardProps {
  court: Court;
  onBook: (court: Court) => void;
  index?: number;
}

export function CourtCard({ court, onBook, index = 0 }: CourtCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="hover:shadow-soft-lg transition-all duration-300 border-2 hover:border-primary/20 overflow-hidden group">
        <div className="relative h-48 bg-gradient-to-br from-blue-100 to-blue-50">
          {court.description && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl font-bold text-blue-200/30">
                {court.name.split(" ")[1] || "T"}
              </div>
            </div>
          )}
          <Badge 
            className="absolute top-3 right-3"
            variant={court.status === "active" ? "default" : "secondary"}
          >
            {court.status === "active" ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Available
              </>
            ) : (
              "Unavailable"
            )}
          </Badge>
        </div>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{court.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="capitalize">{court.type}</span>
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-primary">${court.pricePerHour}</span>
              <p className="text-xs text-muted-foreground">per hour</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {court.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{court.description}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => onBook(court)} 
            className="w-full group-hover:scale-105 transition-transform"
            disabled={court.status !== "active"}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Book Court
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
