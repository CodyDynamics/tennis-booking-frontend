"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useReports, useBookings, useSessions } from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { Calendar, TrendingUp, CheckCircle, Clock, MapPin, ArrowRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, isAfter, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import Link from "next/link";

export function StudentDashboard() {
  const { user } = useAuth();
  const { data: reports = [], isLoading: reportsLoading } = useReports(user?.id);
  const { data: bookings = [] } = useBookings(user?.id);
  const { data: sessions = [] } = useSessions(undefined, user?.id);

  if (reportsLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No reports yet. Book a session to get started!</p>
      </div>
    );
  }

  // Calculate averages
  const avgForehand = reports.reduce((sum, r) => sum + r.forehandScore, 0) / reports.length;
  const avgBackhand = reports.reduce((sum, r) => sum + r.backhandScore, 0) / reports.length;
  const avgServe = reports.reduce((sum, r) => sum + r.serveScore, 0) / reports.length;
  const avgFootwork = reports.reduce((sum, r) => sum + r.footworkScore, 0) / reports.length;
  const avgStamina = reports.reduce((sum, r) => sum + r.staminaScore, 0) / reports.length;
  const overallAvg = (avgForehand + avgBackhand + avgServe + avgFootwork + avgStamina) / 5;

  const attendanceRate = (reports.filter(r => r.attendance === "present").length / reports.length) * 100;

  // Prepare chart data
  const chartData = reports.map((report) => ({
    date: new Date(report.sessionDate).toLocaleDateString(),
    forehand: report.forehandScore,
    backhand: report.backhandScore,
    serve: report.serveScore,
    footwork: report.footworkScore,
    stamina: report.staminaScore,
  }));

  // Get upcoming bookings
  const upcomingBookings = bookings.filter((booking) => 
    isAfter(new Date(booking.bookingDate), new Date())
  ).slice(0, 3);

  const upcomingSessions = sessions.filter((session) =>
    isAfter(new Date(session.sessionDate), new Date())
  ).slice(0, 3);

  // Monthly summary
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthlyReports = reports.filter((report) => {
    const reportDate = new Date(report.sessionDate);
    return isWithinInterval(reportDate, { start: monthStart, end: monthEnd });
  });

  const monthlyAvg = monthlyReports.length > 0
    ? monthlyReports.reduce((sum, r) => 
        sum + (r.forehandScore + r.backhandScore + r.serveScore + r.footworkScore + r.staminaScore) / 5, 0
      ) / monthlyReports.length
    : 0;

  // Attendance history
  const attendanceHistory = reports.map((report) => ({
    date: format(new Date(report.sessionDate), "MMM dd"),
    present: report.attendance === "present" ? 1 : 0,
  }));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Student Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">Track your progress and upcoming sessions</p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-soft hover:shadow-soft-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Average</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallAvg.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">out of 10</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-soft hover:shadow-soft-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceRate.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">sessions attended</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-soft hover:shadow-soft-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyAvg.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">{format(currentMonth, "MMM yyyy")}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-soft hover:shadow-soft-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.length}</div>
              <p className="text-xs text-muted-foreground">progress reports</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skill Progress Trend</CardTitle>
          <CardDescription>Track your skill improvement over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="forehand" stroke="#8884d8" name="Forehand" />
              <Line type="monotone" dataKey="backhand" stroke="#82ca9d" name="Backhand" />
              <Line type="monotone" dataKey="serve" stroke="#ffc658" name="Serve" />
              <Line type="monotone" dataKey="footwork" stroke="#ff7300" name="Footwork" />
              <Line type="monotone" dataKey="stamina" stroke="#00ff00" name="Stamina" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Upcoming Bookings</CardTitle>
              <CardDescription>Your scheduled court bookings</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingBookings.length > 0 ? (
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Court Booking</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(booking.bookingDate), "MMM dd")} • {booking.startTime}
                          </p>
                        </div>
                      </div>
                      <Badge variant={booking.bookingStatus === "confirmed" ? "default" : "outline"}>
                        {booking.bookingStatus}
                      </Badge>
                    </div>
                  ))}
                  <Link href="/booking-history">
                    <Button variant="outline" className="w-full">
                      View All Bookings
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No upcoming bookings</p>
                  <Link href="/courts">
                    <Button>Book a Court</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your scheduled coaching sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length > 0 ? (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Coaching Session</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(session.sessionDate), "MMM dd")} • {session.startTime}
                          </p>
                        </div>
                      </div>
                      <Badge variant={session.status === "scheduled" ? "default" : "outline"}>
                        {session.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No upcoming sessions</p>
                  <Link href="/coaches">
                    <Button>Book a Session</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
            <CardDescription>Your attendance record over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={attendanceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Bar dataKey="present" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Your latest progress reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.slice(0, 3).map((report) => (
                <div key={report.id} className="border-b pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{format(new Date(report.sessionDate), "MMM dd, yyyy")}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.attendance === "present" ? (
                          <span className="text-green-600">Present</span>
                        ) : (
                          <span className="text-red-600">Absent</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Avg: {((report.forehandScore + report.backhandScore + report.serveScore + report.footworkScore + report.staminaScore) / 5).toFixed(1)}</p>
                    </div>
                  </div>
                  {report.overallComment && (
                    <p className="text-sm text-muted-foreground mt-2">{report.overallComment}</p>
                  )}
                  {report.nextGoal && (
                    <p className="text-sm text-blue-600 mt-2">
                      <strong>Next Goal:</strong> {report.nextGoal}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
