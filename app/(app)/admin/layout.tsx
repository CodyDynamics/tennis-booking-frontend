"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import { motion } from "framer-motion";
import {
    Activity,
    ArrowLeft,
    Building2,
    CalendarClock,
    Grid3X3,
    LayoutDashboard,
    LogOut,
    Shapes,
    Shield,
    Users
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const ADMIN_VIEW_PERMISSIONS = [
  "dashboard:view",
  "courts:view",
  "users:view",
  "memberships:view",
  "roles:view",
  "branches:view",
  "organizations:view",
  "locations:view",
  "areas:view",
  "sports:view",
  "bookings:view",
];

/** Required permission (view) per admin path. Only super_admin has full access; others need assigned permission. */
function getRequiredPermissionForPath(path: string): string | null {
  if (path === "/admin" || path === "/admin/") return "dashboard:view";
  if (path.startsWith("/admin/courts")) return "courts:view";
  if (path.startsWith("/admin/court-management")) return "courts:view";
  if (path.startsWith("/admin/users")) return "users:view";
  if (path.startsWith("/admin/user-memberships")) return "memberships:view";
  if (path.startsWith("/admin/roles")) return "roles:view";
  if (path.startsWith("/admin/branches")) return "branches:view";
  if (path.startsWith("/admin/organizations")) return "organizations:view";
  if (path.startsWith("/admin/areas")) return "areas:view";
  if (path.startsWith("/admin/sports")) return "sports:view";
  if (path.startsWith("/admin/bookings")) return "bookings:view";
  return null;
}

function canAccessAdmin(user: User | null, pathname: string): boolean {
  if (!user) return false;
  if (pathname.startsWith("/admin/locations") && user.role !== "super_admin") {
    return false;
  }
  if (user.role === "super_admin" || user.role === "admin") return true;
  const required = getRequiredPermissionForPath(pathname);
  if (!required) {
    return ADMIN_VIEW_PERMISSIONS.some((p) => user!.permissions?.includes(p));
  }
  return !!user.permissions?.includes(required);
}

import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";
import { AdminProvider } from "./admin-context";
import { LocationScopeSelector } from "./components/location-scope-selector";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = canAccessAdmin(user ?? null, pathname);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!isLoading && user && !allowed) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, user, allowed, router, pathname]);

  // Admin navigation: always scroll content to top.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    const el = document.querySelector("main");
    if (el && "scrollTo" in el) (el as HTMLElement).scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <GlobalLoadingPlaceholder minHeight="min-h-screen" />
      </div>
    );
  }

  if (!allowed) return null;

  const allNavItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/court-management", label: "Court Management", icon: Grid3X3 },
    { href: "/admin/courts", label: "Court Time Assignments", icon: CalendarClock },
    { href: "/admin/bookings", label: "Bookings", icon: Activity },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/user-memberships", label: "Memberships", icon: Users },
    { href: "/admin/roles", label: "Roles & Permissions", icon: Shield },
    { href: "/admin/locations", label: "Locations", icon: Building2 },
    { href: "/admin/sports", label: "Sports", icon: Shapes },
    // { href: "/admin/areas", label: "Areas", icon: MapPin },
    // { href: "/admin/branches", label: "Branches", icon: Building2 },
    // { href: "/admin/organizations", label: "Organizations", icon: Network },
  ];

  const navItems =
    user.role === "super_user"
      ? allNavItems.filter((i) =>
        [
          "/admin",
          "/admin/users",
          "/admin/user-memberships",
          "/admin/court-management",
          "/admin/courts",
          "/admin/areas",
        ].includes(i.href),
      )
      : allNavItems;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <AdminProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
        <aside className="w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shadow-xl z-20">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <Link href="/admin" className="flex items-center space-x-3 group">
              <motion.div
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.3 }}
                className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2.5 text-primary-foreground shadow-md shadow-primary/25 ring-1 ring-primary/20"
              >
                <Activity className="h-6 w-6" />
              </motion.div>
              <span className="text-2xl flex flex-col font-black tracking-tight text-slate-900 dark:text-white">
                CodyPlay
                <span className="text-primary text-sm font-semibold">Admin</span>
              </span>
            </Link>
          </div>

          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
            <LocationScopeSelector />
            {/* <SportSelector /> */}
          </div>

          <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
            <p className="px-4 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Administration</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start h-12 text-md transition-all rounded-xl font-medium",
                      isActive
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "mr-3 h-5 w-5 shrink-0",
                        isActive ? "text-primary-foreground/90" : "text-slate-400",
                      )}
                    />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start h-12 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <ArrowLeft className="mr-3 h-5 w-5 text-slate-400" />
                Main Application
              </Button>
            </Link>
            <Button variant="ghost" onClick={handleLogout} className="w-full justify-start h-12 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 rounded-xl">
              <LogOut className="mr-3 h-5 w-5 text-red-400" />
              Logout
            </Button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 relative">
          <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-100/50 to-transparent dark:from-blue-900/10 pointer-events-none z-0"></div>
          <div className="container py-6 px-8 lg:px-12 relative z-10 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </AdminProvider>
  );
}
