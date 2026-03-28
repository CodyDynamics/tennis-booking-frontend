"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-store";
import { api, ApiError } from "@/lib/api";

export default function ChangeRequiredPasswordPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    setPending(true);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setError(Array.isArray(msg) ? msg.join(", ") : (msg ?? err.message));
      } else {
        setError("Could not update password. Try again.");
      }
    } finally {
      setPending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!user?.mustChangePasswordOnFirstLogin) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm">
          No password change is required. You can continue using the app.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md shadow-soft-lg border border-border/80">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            Your administrator asked you to change your password before using the app. Enter your
            current password once, then your new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="cur">Current password</Label>
              <Input
                id="cur"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nw">New password</Label>
              <Input
                id="nw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf">Confirm new password</Label>
              <Input
                id="cf"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Saving…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
