"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingLabel } from "@/components/ui/loading-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { User, Mail, MapPin } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/lib/auth-store";
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas/register.schema";
import { ApiError } from "@/lib/api";
import { safeNextPath } from "@/lib/safe-next-path";

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
  /** When set, called after successful registration instead of navigating to `/`. */
  onRegisterSuccess?: () => void;
  redirectTo?: string | null;
}

export function RegisterForm({
  onSwitchToLogin,
  onRegisterSuccess,
  redirectTo,
}: RegisterFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register: registerUser, isRegistering } = useAuth();
  const router = useRouter();

  const onSubmit = async (data: RegisterFormValues) => {
    setSubmitError(null);
    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`;
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        fullName,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone,
        homeAddress: data.address?.trim() || null,
      });
      if (onRegisterSuccess) onRegisterSuccess();
      else {
        const next = safeNextPath(redirectTo);
        router.push(next ?? "/");
      }
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
              <Label htmlFor="phone">Phone</Label>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    id="phone"
                    international
                    defaultCountry="US"
                    countryCallingCodeEditable={false}
                    placeholder="Enter phone number"
                    value={field.value || ""}
                    onChange={(value) => field.onChange(value || "")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                )}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  placeholder="123 Nguyen Trai, District 1, HCMC"
                  className="pl-10"
                  {...register("address")}
                />
              </div>
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
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
            <Button
              type="submit"
              className="w-full text-md font-bold h-11 bg-primary hover:opacity-90 text-primary-foreground shadow-brand"
              disabled={isRegistering}
              aria-busy={isRegistering}
            >
              {isRegistering ? (
                <LoadingLabel>Creating account</LoadingLabel>
              ) : (
                "Register"
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
