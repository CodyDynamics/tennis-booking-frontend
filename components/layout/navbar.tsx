"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import type { User as AppUser } from "@/types";
import { motion } from "framer-motion";
import { Activity, ChevronDown, LogIn, Menu, Shield, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Admin area: full admins, super_admin, or staff with any admin-nav permission. */
function canShowAdminNav(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  const role = user.role;
  if (role === "admin" || role === "super_admin") return true;
  const perms = user.permissions;
  if (!perms?.length) return false;
  return ["courts:view", "users:view", "roles:view", "branches:view", "bookings:view"].some((p) =>
    perms.includes(p),
  );
}

function navDisplayFirstName(user: AppUser): string {
  const f = user.firstName?.trim();
  if (f) return f;
  const t = user.fullName?.trim() ?? "";
  if (!t) return "there";
  return t.split(/\s+/)[0] ?? "there";
}

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  // Hide navbar on auth pages
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
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
    // { href: "/booking-history", label: "History", icon: History },
  ];

  const requireLoginForHref = (e: React.MouseEvent, href: string) => {
    if (isLoading) {
      e.preventDefault();
      return;
    }
    if (!isAuthenticated) {
      e.preventDefault();
      const next = encodeURIComponent(href);
      router.push(`/login?next=${next}`);
    }
  };

  const navigateWithAuthGate = (href: string) => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const next = encodeURIComponent(href);
      router.push(`/login?next=${next}`);
      return;
    }
    router.push(href);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <motion.div
              // whileHover={{ rotate: 180, scale: 1.1 }}
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-br from-primary to-primary-hover rounded-xl p-2 text-primary-foreground shadow-brand"
            >
              <Activity className="h-6 w-6" />
              {/* <div className="w-10 h-10 justify-center items-center flex">
                <Image
                  src="/images/home/logo.jpeg"
                  alt="CodyReserve Logo"
                  width={50}
                  height={50}
                />
              </div> */}
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
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => requireLoginForHref(e, item.href)}
                >
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "transition-all duration-300 rounded-full px-5",
                      isActive
                        ? "bg-primary text-primary-foreground hover:bg-primary-hover shadow-brand"
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
            {/* <div className="relative" ref={dropdownRef}>
              <Button
                variant={pathname.startsWith("/locations/") ? "default" : "ghost"}
                className={cn(
                  "transition-all duration-300 rounded-full px-5",
                  pathname.startsWith("/locations/")
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover shadow-brand"
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
            </div> */}

            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-2"></div>

            {showAuthButtons && canShowAdminNav(user) && (
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
                  <div className="hidden md:flex items-center ml-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-11 gap-2 rounded-full pl-2 pr-3 hover:bg-muted"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <User className="h-5 w-5" />
                          </span>
                          <span className="hidden sm:inline text-sm text-muted-foreground">
                            Hi,{" "}
                            <span className="font-semibold text-foreground">
                              {navDisplayFirstName(user)}
                            </span>
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href="/profile" className="cursor-pointer">
                            Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onSelect={(e) => {
                            e.preventDefault();
                            void handleLogout();
                          }}
                        >
                          Logout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                {!isAuthenticated && (
                  <Link href="/login" className="ml-2">
                    <Button className="rounded-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-brand px-6 font-bold">
                      Sign In <LogIn className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile: compact menu */}
          {showAuthButtons && (
            <div className="flex md:hidden items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 rounded-full px-3">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      navigateWithAuthGate("/coaches");
                    }}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Coaches
                  </DropdownMenuItem>
                  {isAuthenticated && user && canShowAdminNav(user) && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4 text-primary" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {isAuthenticated && user ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onSelect={(e) => {
                          e.preventDefault();
                          void handleLogout();
                        }}
                      >
                        Logout
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/register" className="cursor-pointer">
                          Sign Up
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/login" className="cursor-pointer">
                          Sign In
                          <LogIn className="ml-2 h-4 w-4" />
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
