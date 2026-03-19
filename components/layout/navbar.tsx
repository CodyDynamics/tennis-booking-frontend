"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Users, LogIn, User, LogOut, Shield, Activity, MapPin, ChevronDown, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import { useLocations } from "@/lib/queries";
import { useState, useRef, useEffect } from "react";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [locationOpen, setLocationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: locations = [] } = useLocations();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    { href: "/coaches", label: "Coaches", icon: Users },
    { href: "/booking-history", label: "History", icon: History },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="bg-primary rounded-xl p-2 text-primary-foreground shadow-brand"
            >
              <Activity className="h-6 w-6" />
            </motion.div>
            <span className="text-2xl font-black tracking-tight text-foreground">
              CodyReserve
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
                        ? "bg-primary text-primary-foreground hover:opacity-90 shadow-brand"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span className="font-semibold">{item.label}</span>
                  </Button>
                </Link>
              );
            })}

            {/* Location dropdown */}
            <div className="relative" ref={dropdownRef}>
              <Button
                variant={pathname.startsWith("/locations/") ? "default" : "ghost"}
                className={cn(
                  "transition-all duration-300 rounded-full px-5",
                  pathname.startsWith("/locations/")
                    ? "bg-primary text-primary-foreground hover:opacity-90 shadow-brand"
                    : "text-muted-foreground hover:bg-muted"
                )}
                onClick={() => setLocationOpen((o) => !o)}
                onMouseEnter={() => setLocationOpen(true)}
              >
                <MapPin className="mr-2 h-4 w-4" />
                <span className="font-semibold">Location</span>
                <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", locationOpen && "rotate-180")} />
              </Button>
              {locationOpen && (
                <div
                  className="absolute top-full left-0 mt-1 py-2 min-w-[220px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50"
                  onMouseLeave={() => setLocationOpen(false)}
                >
                  {locations.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No locations</div>
                  ) : (
                    locations.map((loc) => (
                      <Link
                        key={loc.id}
                        href={`/locations/${loc.id}/courts`}
                        className="block px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        onClick={() => setLocationOpen(false)}
                      >
                        {loc.name}
                        {loc.address && (
                          <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {loc.address}
                          </span>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-2"></div>

            {showAuthButtons && (user?.role === "admin" || (user?.permissions && ["courts:view", "users:view", "roles:view", "branches:view", "bookings:view"].some((p) => user.permissions!.includes(p)))) && (
              <Link href="/admin">
                <Button variant="outline" className={cn("rounded-full border-border", pathname.startsWith("/admin") && "bg-primary/10 text-primary border-primary/30")}>
                  <Shield className="mr-2 h-4 w-4 text-primary" />
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
                    <Button className="rounded-full bg-primary hover:opacity-90 text-primary-foreground shadow-brand px-6 font-bold">
                      Sign In <LogIn className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile: Sign In / Sign Up and auth always visible (no menu to open) */}
          {showAuthButtons && (
            <div className="flex md:hidden items-center gap-2">
              {isAuthenticated && user ? (
                <>
                  <Link href="/profile">
                    <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 dark:bg-slate-800">
                      <User className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-full text-red-500">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/register">
                    <Button variant="outline" size="sm" className="rounded-full">
                      Sign Up
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="sm" className="rounded-full bg-primary hover:opacity-90 text-primary-foreground px-4 font-bold">
                      Sign In <LogIn className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
