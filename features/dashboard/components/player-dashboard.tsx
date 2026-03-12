"use client";

import { useAuth } from "@/lib/auth-store";
import { useBookings } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function PlayerDashboard() {
  const { user } = useAuth();
  const { data: bookings = [], isLoading } = useBookings(user?.id);
  const router = useRouter();

  const upcomingBookings = bookings
    .filter((b) => {
      const bookingDate = new Date(`${b.bookingDate}T${b.startTime}`);
      return bookingDate >= new Date() && b.bookingStatus !== "cancelled";
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.bookingDate}T${a.startTime}`);
      const dateB = new Date(`${b.bookingDate}T${b.startTime}`);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  const pastBookings = bookings
    .filter((b) => {
      const bookingDate = new Date(`${b.bookingDate}T${b.startTime}`);
      return bookingDate < new Date() || b.bookingStatus === "cancelled";
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.bookingDate}T${a.startTime}`);
      const dateB = new Date(`${b.bookingDate}T${b.startTime}`);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getBookingTypeLabel = (type: string) => {
    switch (type) {
      case "COURT_ONLY":
        return "Court Only";
      case "COURT_COACH":
        return "Court + Coach";
      case "TRAINING":
        return "Training Session";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.fullName}!</h1>
        <p className="text-muted-foreground mt-2">
          Manage your court bookings and view your history
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Bookings</CardTitle>
                  <CardDescription>
                    Your scheduled court bookings
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/courts")}
                >
                  Book Court
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No upcoming bookings</p>
                  <Button onClick={() => router.push("/courts")}>
                    Book Your First Court
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 border rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getStatusColor(booking.bookingStatus)}>
                              {booking.bookingStatus}
                            </Badge>
                            <Badge variant="outline">
                              {getBookingTypeLabel(booking.bookingType)}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{format(new Date(booking.bookingDate), "MMM dd, yyyy")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {booking.startTime} - {booking.endTime}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>Court {booking.courtId}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${booking.totalPrice}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Booking History</CardTitle>
                  <CardDescription>
                    Your past court bookings
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/booking-history")}
                >
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pastBookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No booking history</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pastBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getStatusColor(booking.bookingStatus)}>
                              {booking.bookingStatus}
                            </Badge>
                            <Badge variant="outline">
                              {getBookingTypeLabel(booking.bookingType)}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{format(new Date(booking.bookingDate), "MMM dd, yyyy")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {booking.startTime} - {booking.endTime}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${booking.totalPrice}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Button
                variant="outline"
                className="h-auto py-4 justify-start"
                onClick={() => router.push("/courts")}
              >
                <div className="text-left">
                  <p className="font-semibold">Book a Court</p>
                  <p className="text-sm text-muted-foreground">
                    Reserve a court for casual play
                  </p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 justify-start"
                onClick={() => router.push("/coaches")}
              >
                <div className="text-left">
                  <p className="font-semibold">Book with Coach</p>
                  <p className="text-sm text-muted-foreground">
                    Book court with a coach
                  </p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
