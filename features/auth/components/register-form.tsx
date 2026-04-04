"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingLabel } from "@/components/ui/loading-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { User, Mail, MapPin } from "lucide-react";
import { UsPhoneField } from "@/components/ui/us-phone-field";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas/register.schema";
import { ApiError } from "@/lib/api";
import { safeNextPath } from "@/lib/safe-next-path";
import type { User as AppUser } from "@/types";
import { VerifyOtpStep } from "./verify-otp-step";

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
  onRegisterSuccess?: () => void;
  redirectTo?: string | null;
}

export function RegisterForm({
  onSwitchToLogin,
  onRegisterSuccess,
  redirectTo,
}: RegisterFormProps) {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [pendingEmail, setPendingEmail] = useState("");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { phone: "" },
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data: authConfig } = useQuery({
    queryKey: ["auth", "config"],
    queryFn: () => api.auth.getConfig(),
    staleTime: 5 * 60 * 1000,
  });
  const registrationEmailEnabled = authConfig?.registrationEmailEnabled ?? true;

  const {
    requestRegisterOtp,
    verifyRegisterOtp,
    isRequestingRegisterOtp,
    isVerifyingRegisterOtp,
  } = useAuth();
  const router = useRouter();

  const onDetailsSubmit = async (data: RegisterFormValues) => {
    setSubmitError(null);
    const email = data.email.trim().toLowerCase();
    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`;
    try {
      const registeredUser = await requestRegisterOtp({
        email,
        password: data.password,
        fullName,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone,
        street: data.street.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        zipCode: data.zipCode.trim(),
      });
      if (registeredUser) {
        goAfterRegister(registeredUser);
        return;
      }
      setPendingEmail(email);
      setStep("otp");
    } catch (error) {
      if (error instanceof ApiError) {
        const msg = error.body?.message;
        setSubmitError(Array.isArray(msg) ? msg[0] : (msg ?? "Could not send verification code."));
      } else {
        setSubmitError("Could not send verification code. Please try again.");
      }
    }
  };

  const afterRegister = () => {
    if (onRegisterSuccess) onRegisterSuccess();
    else {
      const next = safeNextPath(redirectTo);
      router.push(next ?? "/");
    }
  };

  const goAfterRegister = (u: AppUser) => {
    if (u.mustChangePasswordOnFirstLogin) {
      router.push("/change-required-password");
      return;
    }
    afterRegister();
  };

  const handleBackToDetails = () => {
    setStep("details");
    setSubmitError(null);
  };

  if (step === "otp") {
    return (
      <VerifyOtpStep
        email={pendingEmail}
        submitLabel="Verify & create account"
        backLabel="Edit registration details"
        isSubmitting={isVerifyingRegisterOtp}
        error={submitError}
        onVerify={async (otp) => {
          setSubmitError(null);
          try {
            const u = await verifyRegisterOtp(pendingEmail, otp);
            goAfterRegister(u);
          } catch (error) {
            if (error instanceof ApiError) {
              const msg = error.body?.message;
              setSubmitError(
                Array.isArray(msg) ? msg[0] : (msg ?? "Invalid or expired code."),
              );
            } else {
              setSubmitError("Invalid or expired code. Request a new code from the previous step.");
            }
          }
        }}
        onBack={handleBackToDetails}
      />
    );
  }

  return (
    <div>
      <Card className="w-full shadow-soft-lg border-0 bg-transparent">
        <CardContent>
          <form onSubmit={handleSubmit(onDetailsSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder="John"
                    className="pl-10"
                    {...register("firstName")}
                  />
                </div>
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    className="pl-10"
                    {...register("lastName")}
                  />
                </div>
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (US)</Label>
              <p className="text-xs text-muted-foreground">
                10-digit US number; stored as +1…
              </p>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <UsPhoneField
                    id="phone"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="street">Street address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="street"
                    placeholder="123 Main Street"
                    className="pl-10"
                    {...register("street")}
                  />
                </div>
                {errors.street && (
                  <p className="text-sm text-destructive">{errors.street.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="Austin" {...register("city")} />
                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="TX" maxLength={50} {...register("state")} />
                  {errors.state && (
                    <p className="text-sm text-destructive">{errors.state.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP code</Label>
                  <Input
                    id="zipCode"
                    placeholder="78701"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={10}
                    {...register("zipCode")}
                  />
                  {errors.zipCode && (
                    <p className="text-sm text-destructive">{errors.zipCode.message}</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                register={register("password")}
                error={errors.password?.message}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <PasswordInput
                id="confirmPassword"
                register={register("confirmPassword")}
                error={errors.confirmPassword?.message}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {registrationEmailEnabled
                ? "After you continue, we&apos;ll email a 6-digit code. Your account is created only after you enter that code."
                : "Your account will be created as soon as you continue (email verification is off on this server)."}
            </p>
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
            <Button
              type="submit"
              className="w-full text-md font-bold h-11 bg-primary hover:opacity-90 text-primary-foreground shadow-brand"
              disabled={isRequestingRegisterOtp}
              aria-busy={isRequestingRegisterOtp}
            >
              {isRequestingRegisterOtp ? (
                <LoadingLabel>
                  {registrationEmailEnabled ? "Sending code" : "Creating account"}
                </LoadingLabel>
              ) : (
                registrationEmailEnabled ? "Continue" : "Create account"
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              {onSwitchToLogin ? (
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              ) : (
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
