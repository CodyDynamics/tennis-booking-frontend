"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, KeyRound, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-store";

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: "Admin",
    coach: "Coach",
    student: "Student",
    parent: "Parent",
    player: "Player",
  };
  return labels[role] ?? role;
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Profile
        </h1>
        <p className="text-muted-foreground">View and manage your account information</p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center pb-4">
                <Avatar className="h-24 w-24 border-4 border-primary/10">
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {user.fullName?.charAt(0)?.toUpperCase() ?? user.email?.charAt(0)?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{user.fullName || "—"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{user.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{user.phone || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Details
              </CardTitle>
              <CardDescription>Role and account status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <div className="rounded-md border bg-muted/50 px-3 py-2">
                  <Badge variant="secondary" className="font-normal capitalize">
                    {roleLabel(user.role)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="rounded-md border bg-muted/50 px-3 py-2">
                  <Badge
                    variant={user.status === "active" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {user.status ?? "active"}
                  </Badge>
                </div>
              </div>
              {user.organizationId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Organization ID</label>
                  <div className="rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs truncate">
                    {user.organizationId}
                  </div>
                </div>
              )}
              <div className="pt-4 border-t space-y-2">
                <Link href="/forgot-password">
                  <Button variant="outline" className="w-full">
                    <KeyRound className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
