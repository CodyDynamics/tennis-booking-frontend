"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, KeyRound } from "lucide-react";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/features/auth/schemas/reset-password.schema";
import { api, ApiError } from "@/lib/api";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setSubmitError(null);
    setSuccessMessage(null);
    if (!token) {
      setSubmitError("Invalid or missing reset link. Request a new email from Forgot password.");
      return;
    }
    try {
      const res = await api.auth.resetPassword({
        token,
        newPassword: data.newPassword,
      });
      setSuccessMessage(res.message ?? "Your password has been reset. You can sign in now.");
    } catch (error) {
      if (error instanceof ApiError) {
        const msg = error.body?.message;
        setSubmitError(
          Array.isArray(msg) ? msg[0] : (msg ?? "Reset failed. The link may have expired."),
        );
      } else {
        setSubmitError("Reset failed. Please try again.");
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-slate-200 shadow-lg dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <KeyRound className="h-5 w-5" />
            Set new password
          </CardTitle>
          <CardDescription>
            Choose a new password for your account. This link expires after one hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token && (
            <p className="text-sm text-destructive mb-4">
              This page needs a valid reset link from your email. If you opened this URL manually,
              use the link from the message or{" "}
              <Link href="/forgot-password" className="underline font-medium">
                request a new reset
              </Link>
              .
            </p>
          )}

          {successMessage ? (
            <div className="space-y-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{successMessage}</p>
              <Button asChild className="w-full">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  disabled={!token}
                  {...register("newPassword")}
                />
                {errors.newPassword && (
                  <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  disabled={!token}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting || !token}>
                {isSubmitting ? "Saving…" : "Update password"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
