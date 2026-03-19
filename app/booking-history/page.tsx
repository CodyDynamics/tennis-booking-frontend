"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useBookings, useSessions, useCourts, useCoaches } from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { Calendar, Clock, DollarSign, MapPin, User, History } from "lucide-react";
import { format } from "date-fns";

export default function BookingHistoryPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { data: bookings = [] } = useBookings(user?.id);
  const { data: sessions = [] } = useSessions(undefined, user?.id);
  const { data: courts = [] } = useCourts();
  const { data: coaches = [] } = useCoaches();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const getCourtName = (courtId: string) => {
    return courts.find((c) => c.id === courtId)?.name || "Unknown Court";
  };

  const getCoachName = (coachId: string) => {
    return coaches.find((c) => c.id === coachId)?.user?.fullName || "Unknown Coach";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(260,30%,98%)] via-background to-[hsl(210,40%,98%)] dark:from-slate-950 dark:via-background dark:to-slate-950">
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm font-semibold text-primary mb-6">
            <History className="w-4 h-4 mr-2" /> Your activity
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-3">
            Booking History
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            View your past and upcoming court bookings and coach sessions.
          </p>
        </motion.div>

        <Tabs defaultValue="courts" className="space-y-8">
          <TabsList className="w-full max-w-md mx-auto flex h-14 p-1.5 rounded-full bg-muted/80 border border-border">
            <TabsTrigger
              value="courts"
              className="flex-1 rounded-full font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-brand"
            >
              Court Bookings
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="flex-1 rounded-full font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-brand"
            >
              Coach Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courts" className="space-y-6 mt-8">
            {bookings.length > 0 ? (
              bookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="rounded-2xl border border-border bg-card shadow-soft hover:shadow-soft-lg transition-shadow overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-foreground">
                              {getCourtName(booking.courtId)}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {format(new Date(booking.bookingDate), "EEEE, MMMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            booking.bookingStatus === "confirmed"
                              ? "default"
                              : booking.bookingStatus === "completed"
                                ? "secondary"
                                : "outline"
                          }
                          className="rounded-full font-semibold capitalize shrink-0"
                        >
                          {booking.bookingStatus}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="font-medium text-foreground text-sm">
                              {format(new Date(booking.bookingDate), "MMM d")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Time</p>
                            <p className="font-medium text-foreground text-sm">
                              {booking.startTime} – {booking.endTime}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="font-medium text-foreground text-sm">
                              ${booking.totalPrice}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Booking ID</p>
                          <p className="font-mono text-xs text-foreground">
                            {booking.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card className="rounded-2xl border border-border bg-card">
                <CardContent className="py-16 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No court bookings yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your court reservations will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6 mt-8">
            {sessions.length > 0 ? (
              sessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="rounded-2xl border border-border bg-card shadow-soft hover:shadow-soft-lg transition-shadow overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-foreground">
                              Session with {getCoachName(session.coachId)}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {format(new Date(session.sessionDate), "EEEE, MMMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            session.status === "scheduled"
                              ? "default"
                              : session.status === "completed"
                                ? "secondary"
                                : "outline"
                          }
                          className="rounded-full font-semibold capitalize shrink-0"
                        >
                          {session.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/40">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Time</p>
                            <p className="font-medium text-foreground text-sm">
                              {session.startTime}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="font-medium text-foreground text-sm">
                            {session.durationMinutes} min
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Type</p>
                          <p className="font-medium text-foreground text-sm capitalize">
                            {session.sessionType}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card className="rounded-2xl border border-border bg-card">
                <CardContent className="py-16 text-center">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No coach sessions yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your booked sessions with coaches will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
