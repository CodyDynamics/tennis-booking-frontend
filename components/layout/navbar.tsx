"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, Calendar, Users, FileText, LogIn, User, LogOut, Shield, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { useRouter } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  // Hide navbar on auth pages
  if (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Avoid hydration mismatch by only rendering auth buttons after load
  const showAuthButtons = !isLoading;

  const navItems = [
    { href: "/courts", label: "Courts", icon: Calendar },
    { href: "/coaches", label: "Coaches", icon: Users },
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/booking-history", label: "History", icon: Calendar },
    { href: "/dashboard", label: "Dashboard", icon: Home },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-2 text-white shadow-lg shadow-blue-500/30"
            >
              <Activity className="h-6 w-6" />
            </motion.div>
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Collinmatch<span className="text-blue-600">Sports</span>
            </span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "transition-all duration-300 rounded-full px-5",
                      isActive 
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 shadow-md" 
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span className="font-semibold">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
            
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-2"></div>

            {showAuthButtons && (user?.role === "admin" || (user?.permissions && ["courts:view", "users:view", "roles:view", "branches:view", "bookings:view"].some((p) => user.permissions!.includes(p)))) && (
              <Link href="/admin">
                <Button variant="outline" className={cn("rounded-full border-blue-200 dark:border-blue-900", pathname.startsWith("/admin") && "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400")}>
                  <Shield className="mr-2 h-4 w-4 text-blue-500" />
                  Admin
                </Button>
              </Link>
            )}
            {showAuthButtons && (
              <>
                {isAuthenticated && user && (
                  <div className="flex items-center space-x-2 ml-2">
                    <Link href="/profile">
                      <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                        <User className="h-5 w-5" />
                      </Button>
                    </Link>
                    <Button variant="ghost" onClick={handleLogout} className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {!isAuthenticated && (
                  <Link href="/login" className="ml-2">
                    <Button className="rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 px-6 font-bold">
                      Sign In <LogIn className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
