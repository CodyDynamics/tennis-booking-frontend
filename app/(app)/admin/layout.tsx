"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import { motion } from "framer-motion";
import {
  Activity,
  Building2,
  CalendarDays,
  Grid3X3,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const ADMIN_SIDEBAR_COLLAPSED_KEY = "admin_sidebar_collapsed";

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
  if (path.startsWith("/admin/court-calendar")) return "bookings:view";
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
  const { user, isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = canAccessAdmin(user ?? null, pathname);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "1") {
        setSidebarCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

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
      <div className="fixed inset-x-0 top-20 bottom-0 z-30 bg-slate-50 dark:bg-slate-950">
        <GlobalLoadingPlaceholder minHeight="min-h-full" />
      </div>
    );
  }

  if (!allowed) return null;

  const allNavItems = [
    { href: "/admin", label: "Analytics", icon: LayoutDashboard },
    { href: "/admin/court-management", label: "Court Management", icon: Grid3X3 },
    { href: "/admin/bookings", label: "Bookings", icon: Activity },
    { href: "/admin/court-calendar", label: "Court calendar", icon: CalendarDays },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/user-memberships", label: "Memberships", icon: Users },
    { href: "/admin/roles", label: "Roles & Permissions", icon: Shield },
    { href: "/admin/locations", label: "Locations", icon: Building2 },
    // { href: "/admin/sports", label: "Sports", icon: Shapes },
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
          "/admin/court-calendar",
          "/admin/areas",
        ].includes(i.href),
      )
      : allNavItems;

  return (
    <AdminProvider>
      {/* Fixed below global Navbar (h-20) so the document body does not scroll; only sidebar nav + main pane scroll. */}
      <div className="fixed inset-x-0 top-20 bottom-0 z-30 flex min-h-0 overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
        <aside
          className={cn(
            "z-20 flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-xl transition-[width] duration-200 ease-out dark:border-slate-800 dark:bg-slate-900",
            sidebarCollapsed ? "w-[4.5rem]" : "w-72",
          )}
        >
          <div
            className={cn(
              "border-b border-slate-100 dark:border-slate-800",
              sidebarCollapsed
                ? "flex flex-col items-center gap-2 px-1 py-2"
                : "flex items-center gap-2 px-4 py-2 sm:px-5",
            )}
          >
            <Link
              href="/admin"
              className={cn(
                "group flex min-w-0 items-center",
                sidebarCollapsed ? "justify-center" : "flex-1 gap-3",
              )}
              title={sidebarCollapsed ? "CodyActive Admin" : undefined}
            >
              <motion.div
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.3 }}
                className="shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary-hover p-2.5 text-primary-foreground shadow-md shadow-primary/25 ring-1 ring-primary/20"
              >
                <Activity className="h-6 w-6" />
              </motion.div>
              {!sidebarCollapsed ? (
                <span className="flex min-w-0 flex-col truncate text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  CodyActive
                  <span className="text-sm font-semibold text-primary">Admin</span>
                </span>
              ) : null}
            </Link>
            {!sidebarCollapsed ? (
              <div
                className="h-8 w-px shrink-0 bg-slate-200 dark:bg-slate-700"
                aria-hidden
              />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-9 w-9 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? "Expand admin sidebar" : "Collapse admin sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-5 w-5" aria-hidden />
              ) : (
                <PanelLeftClose className="h-5 w-5" aria-hidden />
              )}
            </Button>
          </div>

          <div
            className={cn(
              "border-b border-slate-100 py-2 dark:border-slate-800",
              sidebarCollapsed ? "flex justify-center px-2" : "space-y-4 px-6 py-1",
            )}
          >
            <LocationScopeSelector compact={sidebarCollapsed} />
          </div>

          <nav
            className={cn(
              "scrollbar-app min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain py-2",
              sidebarCollapsed ? "px-2" : "px-4",
            )}
          >
            {!sidebarCollapsed ? (
              <p className="mb-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                Administration
              </p>
            ) : null}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} title={sidebarCollapsed ? item.label : undefined}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "h-12 rounded-xl text-md font-medium transition-all",
                      sidebarCollapsed ? "w-full justify-center px-0" : "w-full justify-start",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary-hover"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        !sidebarCollapsed && "mr-3",
                        isActive ? "text-primary-foreground/90" : "text-slate-400",
                      )}
                    />
                    {!sidebarCollapsed ? item.label : null}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="scrollbar-app relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 dark:bg-slate-950">
          <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-100/50 to-transparent dark:from-blue-900/10 pointer-events-none z-0"></div>
          <div className="container py-6 px-8 lg:px-12 relative z-10 max-w-[100%]">
            {children}
          </div>
        </main>
      </div>
    </AdminProvider>
  );
}
