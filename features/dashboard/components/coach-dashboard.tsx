"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockSessions, mockReports, mockUsers } from "@/lib/mock-data";
import { Calendar, Users, FileText, Plus, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export function CoachDashboard() {
  const todaySessions = mockSessions.filter(
    (session) => session.sessionDate === new Date().toISOString().split("T")[0]
  );
  const pendingReports = mockReports.filter((report) => !report.sessionId);

  const students = mockUsers.filter((u) => u.role === "student").slice(0, 5);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Coach Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">Manage your sessions and student progress</p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySessions.length}</div>
            <p className="text-xs text-muted-foreground">sessions scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReports.length}</div>
            <p className="text-xs text-muted-foreground">reports to complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">active students</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Today's Sessions</CardTitle>
              <CardDescription>Your scheduled sessions for today</CardDescription>
            </CardHeader>
            <CardContent>
              {todaySessions.length > 0 ? (
                <div className="space-y-4">
                  {todaySessions.map((session) => (
                    <div key={session.id} className="p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{session.startTime}</p>
                            <p className="text-sm text-muted-foreground">
                              {session.durationMinutes} minutes • {session.sessionType}
                            </p>
                          </div>
                        </div>
                        <Badge variant={session.status === "scheduled" ? "default" : "outline"}>
                          {session.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No sessions scheduled for today</p>
                </div>
              )}
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
              <CardTitle>Student List</CardTitle>
              <CardDescription>Your assigned students</CardDescription>
            </CardHeader>
            <CardContent>
              {students.length > 0 ? (
                <div className="space-y-3">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {student.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.fullName}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No students assigned</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link href="/reports">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Progress Report
                </Button>
              </Link>
              <Link href="/coaches">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  View Students
                </Button>
              </Link>
              <Link href="/courts">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Book Court
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
