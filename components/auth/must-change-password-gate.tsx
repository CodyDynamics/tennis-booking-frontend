"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";

const PUBLIC_NO_PROFILE = ["/login", "/register", "/forgot-password", "/reset-password"];

/**
 * When `mustChangePasswordOnFirstLogin` is true, force every authenticated route to
 * `/change-required-password` until the user updates their password.
 */
export function MustChangePasswordGate() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof pathname !== "string") return;
    if (PUBLIC_NO_PROFILE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return;
    }
    if (isLoading) return;
    if (!user?.mustChangePasswordOnFirstLogin) return;
    if (pathname === "/change-required-password") return;
    router.replace("/change-required-password");
  }, [user, isLoading, pathname, router]);

  return null;
}
