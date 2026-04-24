"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types";
import type { AuthUser, AuthUserMembership, RegisterInput } from "@/types/api";
import { setStoredAccessToken } from "@/lib/auth-tokens";
import { api, ApiError } from "@/lib/api";

function parseRolePermissions(role: unknown): string[] {
  if (!role || typeof role !== "object" || !("permissions" in role)) return [];
  const p = (role as { permissions?: string | null }).permissions;
  if (typeof p !== "string" || !p.trim()) return [];
  return p.split(",").map((s) => s.trim()).filter(Boolean);
}

function mapAuthUserToUser(a: AuthUser): User {
  const rawRole = a.role as string | { name?: string; permissions?: string | null } | undefined;
  const roleValue =
    typeof rawRole === "object" && rawRole && "name" in rawRole
      ? rawRole.name
      : (rawRole as User["role"]);
  const permissions = typeof rawRole === "object" && rawRole ? parseRolePermissions(rawRole) : undefined;
  const rawM = (a as AuthUser).memberships;
  const memberships: AuthUserMembership[] | undefined = Array.isArray(rawM)
    ? rawM.map((m) => ({
        id: m.id,
        locationId: m.locationId,
        status: m.status,
      }))
    : undefined;

  return {
    id: a.id,
    email: a.email,
    fullName: a.fullName,
    firstName: a.firstName ?? undefined,
    lastName: a.lastName ?? undefined,
    role: (roleValue as User["role"]) ?? "player",
    phone: (a as { phone?: string }).phone ?? undefined,
    mustChangePasswordOnFirstLogin: a.mustChangePasswordOnFirstLogin ?? false,
    status: "active",
    permissions: permissions?.length ? permissions : undefined,
    memberships: memberships?.length ? memberships : undefined,
  };
}

async function fetchUserFromProfile(): Promise<User | null> {
  try {
    const profile = await api.auth.getProfile();
    return profile ? mapAuthUserToUser(profile) : null;
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
    // On 401: try refresh token once (e.g. access token expired, cookie still valid)
    try {
      await api.auth.refresh();
      const profile = await api.auth.getProfile();
      return profile ? mapAuthUserToUser(profile) : null;
    } catch {
      return null;
    }
  }
}

const PUBLIC_AUTH_PATHS = ["/login", "/register"];

export function useAuth() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isPublicAuthPage =
    typeof pathname === "string" && PUBLIC_AUTH_PATHS.includes(pathname);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["auth", "user"],
    queryFn: fetchUserFromProfile,
    enabled: mounted && !isPublicAuthPage,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({
      email,
      password,
      rememberMe,
    }: {
      email: string;
      password: string;
      rememberMe?: boolean;
    }) => api.auth.login({ email, password, rememberMe }),
    onSuccess: (res) => {
      queryClient.setQueryData(["auth", "user"], mapAuthUserToUser(res.user));
      void queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
      void queryClient.invalidateQueries({ queryKey: ["locationMembership"] });
    },
  });

  const requestLoginOtpMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.auth.requestLoginOtp({ email, password }),
  });

  const verifyLoginOtpMutation = useMutation({
    mutationFn: ({
      email,
      otp,
      rememberMe,
    }: {
      email: string;
      otp: string;
      rememberMe?: boolean;
    }) => api.auth.verifyLoginOtp({ email, otp, rememberMe }),
    onSuccess: (res) => {
      queryClient.setQueryData(["auth", "user"], mapAuthUserToUser(res.user));
      void queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
      void queryClient.invalidateQueries({ queryKey: ["locationMembership"] });
    },
  });

  const requestRegisterOtpMutation = useMutation({
    mutationFn: (data: RegisterInput) => api.auth.requestRegisterOtp(data),
    onSuccess: (res) => {
      if (
        res &&
        typeof res === "object" &&
        "accessToken" in res &&
        res.accessToken &&
        "user" in res &&
        res.user
      ) {
        queryClient.setQueryData(["auth", "user"], mapAuthUserToUser(res.user));
        void queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
        void queryClient.invalidateQueries({ queryKey: ["locations"] });
        void queryClient.invalidateQueries({ queryKey: ["locationMembership"] });
      }
    },
  });

  const verifyRegisterOtpMutation = useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) =>
      api.auth.verifyRegisterOtp({ email, otp }),
    onSuccess: (res) => {
      queryClient.setQueryData(["auth", "user"], mapAuthUserToUser(res.user));
      void queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
      void queryClient.invalidateQueries({ queryKey: ["locationMembership"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      setStoredAccessToken(null);
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.clear();
    },
  });

  const login = (email: string, password: string, rememberMe?: boolean) => {
    return loginMutation
      .mutateAsync({ email, password, rememberMe })
      .then((res) => mapAuthUserToUser(res.user));
  };

  const requestLoginOtp = (email: string, password: string) =>
    requestLoginOtpMutation.mutateAsync({ email, password });

  const loginWithOtp = (
    email: string,
    otp: string,
    rememberMe?: boolean,
  ) =>
    verifyLoginOtpMutation
      .mutateAsync({ email, otp, rememberMe })
      .then((res) => mapAuthUserToUser(res.user));

  const requestRegisterOtp = async (data: RegisterInput) => {
    const res = await requestRegisterOtpMutation.mutateAsync(data);
    if (
      res &&
      typeof res === "object" &&
      "accessToken" in res &&
      res.accessToken &&
      "user" in res &&
      res.user
    ) {
      return mapAuthUserToUser(res.user);
    }
    return null;
  };

  const verifyRegisterOtp = (email: string, otp: string) =>
    verifyRegisterOtpMutation
      .mutateAsync({ email, otp })
      .then((res) => mapAuthUserToUser(res.user));

  const logout = () => logoutMutation.mutateAsync();

  return {
    user,
    isLoading: !mounted || isLoading,
    isAuthenticated: !!user,
    login,
    requestRegisterOtp,
    verifyRegisterOtp,
    logout,
    requestLoginOtp,
    loginWithOtp,
    isLoggingIn: loginMutation.isPending,
    isRequestingRegisterOtp: requestRegisterOtpMutation.isPending,
    isVerifyingRegisterOtp: verifyRegisterOtpMutation.isPending,
    isRequestingOtp: requestLoginOtpMutation.isPending,
    isVerifyingOtp: verifyLoginOtpMutation.isPending,
  };
}
