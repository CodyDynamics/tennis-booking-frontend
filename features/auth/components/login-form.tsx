"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login.schema";
import { ApiError } from "@/lib/api";

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const { login, isLoggingIn } = useAuth();
  const router = useRouter();

  const onSubmit = async (data: LoginFormValues) => {
    setSubmitError(null);
    try {
      await login(data.email, data.password);
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        const msg = error.body?.message;
        setSubmitError(Array.isArray(msg) ? msg[0] : (msg ?? error.message));
      } else {
        setSubmitError("Invalid email or password.");
      }
    }
  };

  return (
    <div>
      <Card className="w-full shadow-soft-lg border-0 bg-transparent">
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-10"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  Remember Me
                </Label>
              </div>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Recovery Password
              </Link>
            </div>
            <Button type="submit" className="w-full text-md font-bold h-11 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20" disabled={isLoggingIn}>
              {isLoggingIn ? "Logging in..." : "Login"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
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
