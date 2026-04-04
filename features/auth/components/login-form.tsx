"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingLabel } from "@/components/ui/loading-label";
import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/lib/auth-store";
import { api, ApiError } from "@/lib/api";
import { requestOtpSchema, type RequestOtpFormValues } from "@/features/auth/schemas/request-otp.schema";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login.schema";
import { safeNextPath } from "@/lib/safe-next-path";
import type { User } from "@/types";
import { VerifyOtpStep } from "./verify-otp-step";

interface LoginFormProps {
  onSwitchToRegister?: () => void;
  /** When set, called after successful login instead of navigating to `/`. */
  onLoginSuccess?: () => void;
  /** e.g. from `?next=/coaches` — must be a safe internal path. */
  redirectTo?: string | null;
}

export function LoginForm({
  onSwitchToRegister,
  onLoginSuccess,
  redirectTo,
}: LoginFormProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingRememberMe, setPendingRememberMe] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: authConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["auth", "config"],
    queryFn: () => api.auth.getConfig(),
    staleTime: 5 * 60 * 1000,
  });
  const loginOtpEnabled = authConfig?.loginOtpEnabled ?? false;

  const { requestLoginOtp, loginWithOtp, login, isRequestingOtp, isVerifyingOtp, isLoggingIn } =
    useAuth();
  const router = useRouter();

  const emailForm = useForm<RequestOtpFormValues>({
    resolver: zodResolver(requestOtpSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const normalLoginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onEmailSubmit = async (data: RequestOtpFormValues) => {
    setSubmitError(null);
    try {
      await requestLoginOtp(data.email, data.password);
      setPendingEmail(data.email);
      setPendingRememberMe(!!data.rememberMe);
      setStep("otp");
    } catch (error) {
      if (error instanceof ApiError) {
        const msg = error.body?.message;
        setSubmitError(Array.isArray(msg) ? msg[0] : (msg ?? error.message));
      } else {
        setSubmitError("Invalid email or password.");
      }
    }
  };

  const afterLoginRedirect = () => {
    if (onLoginSuccess) onLoginSuccess();
    else {
      const next = safeNextPath(redirectTo);
      router.push(next ?? "/");
    }
  };

  const goAfterAuth = (u: User) => {
    if (u.mustChangePasswordOnFirstLogin) {
      router.push("/change-required-password");
      return;
    }
    afterLoginRedirect();
  };

  const onNormalLoginSubmit = async (data: LoginFormValues) => {
    setSubmitError(null);
    try {
      const u = await login(data.email, data.password, data.rememberMe);
      goAfterAuth(u);
    } catch (error) {
      if (error instanceof ApiError) {
        const msg = error.body?.message;
        setSubmitError(Array.isArray(msg) ? msg[0] : (msg ?? error.message));
      } else {
        setSubmitError("Invalid email or password.");
      }
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setSubmitError(null);
    emailForm.setValue("email", pendingEmail);
  };

  if (isLoadingConfig) {
    return (
      <Card className="w-full border-0 bg-transparent shadow-soft-lg">
        <CardContent>
          <GlobalLoadingPlaceholder minHeight="min-h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  // Normal login (no OTP)
  if (!loginOtpEnabled) {
    return (
      <div>
        <Card className="w-full shadow-soft-lg border-0 bg-transparent">
          <CardContent>
            <form
              onSubmit={normalLoginForm.handleSubmit(onNormalLoginSubmit)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    {...normalLoginForm.register("email")}
                  />
                </div>
                {normalLoginForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {normalLoginForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  register={normalLoginForm.register("password")}
                  error={normalLoginForm.formState.errors.password?.message}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember-normal"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    {...normalLoginForm.register("rememberMe", {
                      setValueAs: (v) => v === true || v === "on",
                    })}
                  />
                  <Label htmlFor="remember-normal" className="text-sm cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
              <Button
                type="submit"
                className="w-full text-md font-bold h-11 bg-primary hover:bg-primary-hover text-primary-foreground shadow-brand"
                disabled={isLoggingIn}
                aria-busy={isLoggingIn}
              >
                {isLoggingIn ? <LoadingLabel>Signing in</LoadingLabel> : "Login"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                {onSwitchToRegister ? (
                  <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </button>
                ) : (
                  <Link href="/register" className="text-primary hover:underline font-medium">
                    Sign up
                  </Link>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // OTP flow: step 2
  if (step === "otp") {
    return (
      <VerifyOtpStep
        email={pendingEmail}
        submitLabel="Verify & sign in"
        backLabel="Use a different email"
        isSubmitting={isVerifyingOtp}
        error={submitError}
        onVerify={async (otp) => {
          setSubmitError(null);
          try {
            const u = await loginWithOtp(pendingEmail, otp, pendingRememberMe);
            goAfterAuth(u);
          } catch (error) {
            if (error instanceof ApiError) {
              const msg = error.body?.message;
              setSubmitError(Array.isArray(msg) ? msg[0] : (msg ?? error.message));
            } else {
              setSubmitError("Invalid or expired OTP. Please request a new code.");
            }
          }
        }}
        onBack={handleBackToEmail}
      />
    );
  }

  // OTP flow: step 1 (email + password → request OTP)
  return (
    <div>
      <Card className="w-full shadow-soft-lg border-0 bg-transparent">
        <CardContent>
          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  {...emailForm.register("email")}
                />
              </div>
              {emailForm.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="password-otp">Password</Label>
              <PasswordInput
                id="password-otp"
                register={emailForm.register("password")}
                error={emailForm.formState.errors.password?.message}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  {...emailForm.register("rememberMe", {
                    setValueAs: (v) => v === true || v === "on",
                  })}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  Remember me
                </Label>
              </div>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              We&apos;ll send a verification code to your email after you continue.
            </p>
            <Button
              type="submit"
              className="w-full text-md font-bold h-11 bg-primary hover:bg-primary-hover text-primary-foreground shadow-brand"
              disabled={isRequestingOtp}
              aria-busy={isRequestingOtp}
            >
              {isRequestingOtp ? <LoadingLabel>Sending code</LoadingLabel> : "Continue"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              {onSwitchToRegister ? (
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </button>
              ) : (
                <Link href="/register" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
