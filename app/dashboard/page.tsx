"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StudentDashboard } from "@/features/dashboard/components/student-dashboard";
import { CoachDashboard } from "@/features/dashboard/components/coach-dashboard";
import { AdminDashboard } from "@/features/dashboard/components/admin-dashboard";
import { PlayerDashboard } from "@/features/dashboard/components/player-dashboard";
import { useAuth } from "@/lib/auth-store";
import { LoadingShell } from "@/components/ui/loading-label";

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingShell message="Loading dashboard" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {user.role === "admin" ? (
        <AdminDashboard />
      ) : user.role === "coach" ? (
        <CoachDashboard />
      ) : user.role === "player" ? (
        <PlayerDashboard />
      ) : (
        <StudentDashboard />
      )}
    </div>
  );
}
