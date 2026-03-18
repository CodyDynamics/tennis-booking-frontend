"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Shield,
  ArrowLeft,
  Loader2,
  Activity,
  LogOut,
  Building2,
  Network,
} from "lucide-react";

const ADMIN_VIEW_PERMISSIONS = ["courts:view", "users:view", "roles:view", "branches:view", "organizations:view", "locations:view", "bookings:view"];

/** Required permission (view) per admin path. Only super_admin has full access; others need assigned permission. */
function getRequiredPermissionForPath(path: string): string | null {
  if (path === "/admin" || path === "/admin/") return null;
  if (path.startsWith("/admin/courts")) return "courts:view";
  if (path.startsWith("/admin/users")) return "users:view";
  if (path.startsWith("/admin/roles")) return "roles:view";
  if (path.startsWith("/admin/branches")) return "branches:view";
  if (path.startsWith("/admin/organizations")) return "organizations:view";
  return null;
}

function canAccessAdmin(user: User | null, pathname: string): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  const required = getRequiredPermissionForPath(pathname);
  if (!required) {
    return ADMIN_VIEW_PERMISSIONS.some((p) => user!.permissions?.includes(p));
  }
  return !!user.permissions?.includes(required);
}

import { AdminProvider } from "./admin-context";
import { SportSelector } from "./components/sport-selector";

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
      router.push("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, allowed, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!allowed) return null;

  const navItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/courts", label: "Courts Management", icon: MapPin },
    { href: "/admin/users", label: "Users & Members", icon: Users },
    { href: "/admin/roles", label: "Roles & Permissions", icon: Shield },
    { href: "/admin/branches", label: "Branches", icon: Building2 },
    { href: "/admin/organizations", label: "Organizations", icon: Network },
  ];

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
                whileHover={{ rotate: 180, scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-2 text-white shadow-lg shadow-blue-500/30"
              >
                <Activity className="h-6 w-6" />
              </motion.div>
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Vigor<span className="text-blue-600">Admin</span>
              </span>
            </Link>
          </div>
          
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <SportSelector />
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
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20" 
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    )}
                  >
                    <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-blue-200" : "text-slate-400")} />
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
          <div className="container py-8 px-8 lg:px-12 relative z-10 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </AdminProvider>
  );
}
