"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ReportForm } from "@/features/reports/components/report-form";
import { useAuth } from "@/lib/auth-store";
import { useSessions } from "@/lib/queries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function ReportsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  // Only query sessions when user is loaded and is a coach
  const { data: sessions } = useSessions(
    user && user.role === "coach" ? user.id : undefined
  );

  useEffect(() => {
    // Only redirect after auth state has finished loading
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user && user.role !== "coach") {
        router.push("/");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or not a coach, render nothing (redirect handled in useEffect)
  if (!isAuthenticated || !user || user.role !== "coach") {
    return null;
  }

  // Get unique student IDs from sessions
  const studentIds = sessions
    ? Array.from(new Set(sessions.flatMap((s) => s.studentIds)))
    : [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Create Progress Report
        </h1>
        <p className="text-muted-foreground text-lg">Fill out a progress report for a student session</p>
      </motion.div>

      {studentIds.length > 0 && (
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Select Student</label>
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a student" />
            </SelectTrigger>
            <SelectContent>
              {studentIds.map((id) => (
                <SelectItem key={id} value={id}>
                  Student {id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {selectedStudentId ? (
          <ReportForm studentId={selectedStudentId} coachId={user.id} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Please select a student to create a report
          </div>
        )}
      </motion.div>
    </div>
  );
}
