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
import { User, Mail } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/lib/auth-store";
import { useRoles } from "@/lib/hooks/use-roles";
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas/register.schema";
import { ApiError } from "@/lib/api";

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register: registerUser, isRegistering } = useAuth();
  const { data: roles, isLoading: rolesLoading, isError: rolesError, refetch: refetchRoles } = useRoles();
  const router = useRouter();

  const onSubmit = async (data: RegisterFormValues) => {
    setSubmitError(null);
    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`;
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        fullName,
        roleId: data.roleId,
      });
      router.push("/");
    } catch (error) {
      if (error instanceof ApiError) {
        const msg = error.body?.message;
        setSubmitError(Array.isArray(msg) ? msg[0] : (msg ?? "Registration failed."));
      } else {
        setSubmitError("Registration failed. Please try again.");
      }
    }
  };

  return (
    <div>
      <Card className="w-full shadow-soft-lg border-0 bg-transparent">
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Label htmlFor="roleId">Role</Label>
              <select
                id="roleId"
                disabled={rolesLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                {...register("roleId")}
              >
                <option value="">
                  {rolesLoading ? "Loading roles..." : "Select role..."}
                </option>
                {roles
                  ?.filter((r) => r.name !== "admin" && r.name !== "super_admin")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name === "player" ? "Casual Player" : r.name === "student" ? "Student (Training Member)" : r.name}
                    </option>
                  ))}
              </select>
              {rolesError && (
                <p className="text-sm text-destructive">
                  Could not load roles.{" "}
                  <button type="button" onClick={() => refetchRoles()} className="underline">
                    Retry
                  </button>
                </p>
              )}
              {errors.roleId && (
                <p className="text-sm text-destructive">{errors.roleId.message}</p>
              )}
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
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
            <Button type="submit" className="w-full text-md font-bold h-11 bg-primary hover:opacity-90 text-primary-foreground shadow-brand" disabled={isRegistering || rolesLoading}>
              {isRegistering ? "Registering..." : "Register"}
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
