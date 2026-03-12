"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types";
import { mockUsers } from "./mock-data";

// Mock API functions - to be replaced with real API calls later
const mockLogin = async (email: string, password: string): Promise<User> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const user = mockUsers.find((u) => u.email === email);
  if (!user) throw new Error("Invalid credentials");
  return user;
};

const mockRegister = async (data: {
  email: string;
  password: string;
  fullName: string;
  role: "student" | "coach" | "player";
}): Promise<User> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const newUser: User = {
    id: Date.now().toString(),
    email: data.email,
    fullName: data.fullName,
    role: data.role,
    organizationId: "org1",
    branchId: "branch1",
    status: "active",
  };
  return newUser;
};

const STORAGE_KEY = "tennis_booking_user";

export function useAuth() {
  const queryClient = useQueryClient();

  // Get current user from localStorage
  const getStoredUser = (): User | null => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load user from localStorage into cache when component mounts
    const storedUser = getStoredUser();
    if (storedUser) {
      queryClient.setQueryData(["auth", "user"], storedUser);
    }
  }, [queryClient]);

  // Query for current user - only enabled after mount to avoid hydration mismatch
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["auth", "user"],
    queryFn: () => getStoredUser(),
    enabled: mounted, // Only query after mount
    staleTime: Infinity, // User data never goes stale once loaded
    gcTime: Infinity, // Keep in cache indefinitely
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      mockLogin(email, password),
    onSuccess: (user) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      queryClient.setQueryData(["auth", "user"], user);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      fullName: string;
      role: "student" | "coach" | "player";
    }) => mockRegister(data),
    onSuccess: (user) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      queryClient.setQueryData(["auth", "user"], user);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem(STORAGE_KEY);
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.clear();
    },
  });

  const login = (email: string, password: string) => {
    return loginMutation.mutateAsync({ email, password });
  };

  const register = (data: {
    email: string;
    password: string;
    fullName: string;
    role: "student" | "coach" | "player";
  }) => {
    return registerMutation.mutateAsync(data);
  };

  const logout = () => {
    return logoutMutation.mutateAsync();
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
