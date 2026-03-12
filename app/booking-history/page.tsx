"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useBookings, useSessions, useCourts, useCoaches } from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { Calendar, Clock, DollarSign, MapPin } from "lucide-react";
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
      <div className="flex items-center justify-center min-h-screen">
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
    <div className="container mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Booking History
        </h1>
        <p className="text-muted-foreground">View your past and upcoming bookings</p>
      </motion.div>

      <Tabs defaultValue="courts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courts">Court Bookings</TabsTrigger>
          <TabsTrigger value="sessions">Coach Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="courts" className="space-y-4">
          {bookings.length > 0 ? (
            bookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="shadow-soft hover:shadow-soft-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          {getCourtName(booking.courtId)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {format(new Date(booking.bookingDate), "EEEE, MMMM dd, yyyy")}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          booking.status === "confirmed"
                            ? "default"
                            : booking.status === "completed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Date</p>
                          <p className="font-medium">{format(new Date(booking.bookingDate), "MMM dd")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Time</p>
                          <p className="font-medium">{booking.startTime} - {booking.endTime}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-medium">${booking.totalPrice}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Booking ID</p>
                        <p className="font-mono text-xs">{booking.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No court bookings found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {sessions.length > 0 ? (
            sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="shadow-soft hover:shadow-soft-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          Session with {getCoachName(session.coachId)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {format(new Date(session.sessionDate), "EEEE, MMMM dd, yyyy")}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          session.status === "scheduled"
                            ? "default"
                            : session.status === "completed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Time</p>
                          <p className="font-medium">{session.startTime}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-medium">{session.durationMinutes} minutes</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Type</p>
                        <p className="font-medium capitalize">{session.sessionType}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No coach sessions found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
