"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types";
import type { AuthUser } from "@/types/api";
import { api, ApiError } from "@/lib/api";

function mapAuthUserToUser(a: AuthUser): User {
  return {
    id: a.id,
    email: a.email,
    fullName: a.fullName,
    role: (a.role as User["role"]) ?? "player",
    organizationId: a.organizationId ?? "",
    branchId: a.branchId,
    status: "active",
  };
}

async function fetchUserFromProfile(): Promise<User | null> {
  try {
    const profile = await api.auth.getProfile();
    return profile ? mapAuthUserToUser(profile) : null;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["auth", "user"],
    queryFn: fetchUserFromProfile,
    enabled: mounted,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.auth.login({ email, password }),
    onSuccess: (res) => {
      queryClient.setQueryData(["auth", "user"], mapAuthUserToUser(res.user));
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      fullName: string;
      roleId: string;
      phone?: string;
    }) => api.auth.register(data),
    onSuccess: (res) => {
      queryClient.setQueryData(["auth", "user"], mapAuthUserToUser(res.user));
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.clear();
    },
  });

  const login = (email: string, password: string) => {
    return loginMutation.mutateAsync({ email, password }).then((res) => mapAuthUserToUser(res.user));
  };

  const register = (data: {
    email: string;
    password: string;
    fullName: string;
    roleId: string;
    phone?: string;
  }) => {
    return registerMutation.mutateAsync(data).then((res) => mapAuthUserToUser(res.user));
  };

  const logout = () => logoutMutation.mutateAsync();

  return {
    user,
    isLoading: !mounted || isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
