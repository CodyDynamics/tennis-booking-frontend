"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, Calendar, Users, FileText, LogIn, User, LogOut } from "lucide-react";
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
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm shadow-soft">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Home className="h-6 w-6 text-primary" />
            </motion.div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Tennis Booking
            </span>
          </Link>
          
          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "transition-all",
                      isActive && "shadow-md"
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            {showAuthButtons && (
              <>
                {isAuthenticated && user && (
                  <>
                    <Link href="/profile">
                      <Button variant="ghost" size="icon">
                        <User className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </>
                )}
                {!isAuthenticated && (
                  <Link href="/login">
                    <Button>
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
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
