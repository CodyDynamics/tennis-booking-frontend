"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockBookings, mockUsers, mockCourts, mockCoaches } from "@/lib/mock-data";
import { DollarSign, Users, Calendar, TrendingUp, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function AdminDashboard() {
  const totalBookings = mockBookings.length;
  const totalRevenue = mockBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const activeStudents = mockUsers.filter((u) => u.role === "student" && u.status === "active").length;
  const activeCoaches = mockCoaches.length;
  const totalCourts = mockCourts.length;

  // Revenue by court
  const revenueByCourt = mockCourts.map((court) => {
    const courtBookings = mockBookings.filter((b) => b.courtId === court.id);
    return {
      name: court.name,
      revenue: courtBookings.reduce((sum, b) => sum + b.totalPrice, 0),
    };
  });

  // Booking status distribution
  const bookingStatusData = [
    { name: "Confirmed", value: mockBookings.filter((b) => b.status === "confirmed").length },
    { name: "Pending", value: mockBookings.filter((b) => b.status === "pending").length },
    { name: "Completed", value: mockBookings.filter((b) => b.status === "completed").length },
  ];

  const COLORS = ["#3b82f6", "#60a5fa", "#93c5fd"];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">System overview and analytics</p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-soft hover:shadow-soft-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBookings}</div>
              <p className="text-xs text-muted-foreground">all time</p>
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
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue}</div>
              <p className="text-xs text-muted-foreground">from bookings</p>
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
              <CardTitle className="text-sm font-medium">Active Students</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeStudents}</div>
              <p className="text-xs text-muted-foreground">registered</p>
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
              <CardTitle className="text-sm font-medium">Active Coaches</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCoaches}</div>
              <p className="text-xs text-muted-foreground">available</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-soft hover:shadow-soft-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courts</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCourts}</div>
              <p className="text-xs text-muted-foreground">available</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Revenue by Court</CardTitle>
              <CardDescription>Revenue distribution across courts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByCourt}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Booking Status</CardTitle>
              <CardDescription>Distribution of booking statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bookingStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bookingStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
