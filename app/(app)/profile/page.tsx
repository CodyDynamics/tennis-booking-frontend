"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, KeyRound, Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";
import { UsPhoneField } from "@/components/ui/us-phone-field";
import { api, ApiError } from "@/lib/api";
import type { UpdateOwnProfileBody } from "@/types/api";

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: "Admin",
    super_admin: "Super admin",
    super_user: "Super user",
    coach: "Coach",
    student: "Student",
    parent: "Parent",
    player: "Player",
  };
  return labels[role] ?? role.replace(/_/g, " ");
}

function splitFullName(full: string): { first: string; last: string } {
  const t = full.trim();
  if (!t) return { first: "", last: "" };
  const i = t.indexOf(" ");
  if (i === -1) return { first: t, last: "" };
  return { first: t.slice(0, i), last: t.slice(i + 1).trim() };
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;
    const fromFull = splitFullName(user.fullName ?? "");
    setFirstName((user.firstName ?? fromFull.first).trim());
    setLastName((user.lastName ?? fromFull.last).trim());
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
    setFormError(null);
  }, [user?.id, user?.email, user?.fullName, user?.firstName, user?.lastName, user?.phone]);

  const saveMutation = useMutation({
    mutationFn: (body: UpdateOwnProfileBody) => api.auth.updateProfile(body),
    onSuccess: () => {
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? Array.isArray(err.body?.message)
            ? err.body?.message.join(", ")
            : (err.body?.message as string) ?? err.message
          : err instanceof Error
            ? err.message
            : "Could not save profile.";
      setFormError(msg);
    },
  });

  const canSubmit = useMemo(() => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return false;
    if (!/^\+1\d{10}$/.test(phone.trim())) return false;
    return true;
  }, [firstName, lastName, email, phone]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setFormError("First and last name are required.");
      return;
    }
    if (!email.trim()) {
      setFormError("Email is required.");
      return;
    }
    if (!/^\+1\d{10}$/.test(phone.trim())) {
      setFormError("Enter a valid 10-digit US phone number.");
      return;
    }
    saveMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
  };

  if (authLoading) {
    return <GlobalLoadingPlaceholder minHeight="min-h-[60vh]" />;
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
        <h1 className="text-4xl font-bold mb-2 text-foreground">Profile</h1>
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
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center justify-center pb-2">
                  <Avatar className="h-24 w-24 border-4 border-primary/10">
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {(firstName?.charAt(0) || user.email?.charAt(0) || "?").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-first">First name</Label>
                    <Input
                      id="profile-first"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-last">Last name</Label>
                    <Input
                      id="profile-last"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="profile-email"
                      type="email"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">Phone</Label>
                  <p className="text-xs text-muted-foreground">US number; stored as +1…</p>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-3" />
                    <UsPhoneField
                      id="profile-phone"
                      variant="compact"
                      value={phone}
                      onChange={setPhone}
                      className="flex-1"
                    />
                  </div>
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <Button type="submit" disabled={!canSubmit || saveMutation.isPending} className="w-full">
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {saveMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </form>
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
