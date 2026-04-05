"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { LoadingLabel } from "@/components/ui/loading-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import {
  verifyOtpSchema,
  type VerifyOtpFormValues,
} from "@/features/auth/schemas/verify-otp.schema";

export interface VerifyOtpStepProps {
  email: string;
  /** Shown above the code field */
  description?: string;
  submitLabel: string;
  backLabel?: string;
  isSubmitting: boolean;
  error: string | null;
  onVerify: (otp: string) => void | Promise<void>;
  onBack?: () => void;
}

export function VerifyOtpStep({
  email,
  description,
  submitLabel,
  backLabel = "Go back",
  isSubmitting,
  error,
  onVerify,
  onBack,
}: VerifyOtpStepProps) {
  const form = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { email, otp: "" },
  });

  const { reset } = form;
  useEffect(() => {
    reset({ email, otp: "" });
  }, [email, reset]);

  return (
    <Card className="w-full shadow-soft-lg border-0 bg-transparent">
      <CardContent>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            await onVerify(data.otp);
          })}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground mb-2">
            {description ?? (
              <>
                We sent a 6-digit code to{" "}
                <strong className="text-foreground">{email}</strong>
              </>
            )}
          </p>
          <div className="space-y-2">
            <Label htmlFor="verify-otp-code">Verification code</Label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="verify-otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                className="pl-10 font-mono text-lg tracking-widest"
                {...form.register("otp")}
              />
            </div>
            {form.formState.errors.otp && (
              <p className="text-sm text-destructive">
                {form.formState.errors.otp.message}
              </p>
            )}
          </div>
          <input type="hidden" {...form.register("email")} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full text-md font-bold h-11 bg-primary hover:bg-primary-hover text-primary-foreground shadow-brand"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <LoadingLabel>Verifying</LoadingLabel>
            ) : (
              submitLabel
            )}
          </Button>
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm text-muted-foreground"
              onClick={onBack}
              disabled={isSubmitting}
            >
              {backLabel}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
