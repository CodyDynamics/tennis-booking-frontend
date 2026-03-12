"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Coach } from "@/types";
import { Star, Clock, User } from "lucide-react";

interface CoachCardProps {
  coach: Coach;
  onBook: (coach: Coach) => void;
  index?: number;
}

export function CoachCard({ coach, onBook, index = 0 }: CoachCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="hover:shadow-soft-lg transition-all duration-300 border-2 hover:border-primary/20 overflow-hidden group">
        <div className="relative h-32 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
          <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {coach.user?.fullName.charAt(0) || "C"}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{coach.user?.fullName || "Coach"}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{coach.experienceYears} years experience</span>
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-primary">${coach.hourlyRate}</span>
              <p className="text-xs text-muted-foreground">per hour</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {coach.bio && (
            <p className="text-sm text-muted-foreground line-clamp-3">{coach.bio}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => onBook(coach)} 
            className="w-full group-hover:scale-105 transition-transform"
          >
            <User className="mr-2 h-4 w-4" />
            Book Session
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
