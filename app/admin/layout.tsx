"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Shield,
  ArrowLeft,
  Loader2,
} from "lucide-react";

const ADMIN_VIEW_PERMISSIONS = ["courts:view", "users:view", "roles:view", "branches:view", "bookings:view"];

/** Required permission (view) per admin path. Admin role bypasses. */
function getRequiredPermissionForPath(path: string): string | null {
  if (path === "/admin" || path === "/admin/") return null;
  if (path.startsWith("/admin/courts")) return "courts:view";
  if (path.startsWith("/admin/users")) return "users:view";
  if (path.startsWith("/admin/roles")) return "roles:view";
  return null;
}

function canAccessAdmin(user: User | null, pathname: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const required = getRequiredPermissionForPath(pathname);
  if (!required) {
    return ADMIN_VIEW_PERMISSIONS.some((p) => user!.permissions?.includes(p));
  }
  return !!user.permissions?.includes(required);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = canAccessAdmin(user ?? null, pathname);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!isLoading && user && !allowed) {
      router.push("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, allowed, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  const navItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/courts", label: "Courts", icon: MapPin },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/roles", label: "Roles & Permissions", icon: Shield },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start", isActive && "bg-primary/10 text-primary")}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto bg-background">
        <div className="container py-6 px-6">{children}</div>
      </main>
    </div>
  );
}
