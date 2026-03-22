"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import Link from "next/link";
import { Circle, Activity, Trophy, Star } from "lucide-react";

// Hero image: tennis court (Unsplash, free to use)
const AUTH_HERO_IMAGE =
  "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80";

type AuthMode = "login" | "register";

interface AuthLayoutProps {
  initialMode?: AuthMode;
  /** After login/register success (from `?next=`). */
  redirectTo?: string | null;
}

export function AuthLayout({
  initialMode = "login",
  redirectTo,
}: AuthLayoutProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate fixed positions for confetti stars to avoid hydration mismatch
  const confettiPositions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      top: (i * 11 + 5) % 100,
      left: (i * 17 + 10) % 100,
      delay: i * 0.2,
      duration: 3 + (i % 4) * 0.5,
      xOffset: (i % 3) * 10 - 5,
    }));
  }, []);

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
  };

  return (
    <div className="flex min-h-screen relative font-sans">
      {/* Left Panel - Tennis court hero image + overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="hidden lg:flex lg:w-5/12 bg-slate-950 relative overflow-hidden"
      >
        {/* Background image: tennis court */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${AUTH_HERO_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-slate-950/75" />
        {/* Decorative elements & glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/15 blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-600/15 blur-[100px]" />

          <motion.div
            animate={{
              y: [0, -30, 0],
              rotate: [0, 90],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-32 left-32"
          >
            <Circle className="h-32 w-32 text-indigo-500/10 fill-indigo-500/10 blur-sm" />
          </motion.div>

          {mounted && confettiPositions.map((pos, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -40, 0],
                x: [0, pos.xOffset, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: pos.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: pos.delay,
              }}
              className="absolute"
              style={{
                top: `${pos.top}%`,
                left: `${pos.left}%`,
              }}
            >
              <Star className="h-3 w-3 text-white/10" />
            </motion.div>
          ))}
        </div>

        {/* Logo */}
        <div className="absolute top-8 left-10 z-20">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-1.5 text-white">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              CodyReserve
            </span>
          </Link>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col justify-center items-center px-16 w-full text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full space-y-8"
          >
            <div className="inline-block p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md mb-4 shadow-2xl">
              <Activity className="h-12 w-12 text-blue-400" />
            </div>

            <h2 className="text-5xl font-black leading-tight tracking-tight">
              {mode === "login" ? "Welcome back to the court." : "Join the elite club."}
            </h2>

            <p className="text-lg text-slate-400 max-w-md leading-relaxed">
              {mode === "login"
                ? "Sign in to manage your bookings, discover premier tennis & pickleball courts, and elevate your game."
                : "Create an account to unlock exclusive access to top-tier sports facilities and expert coaching."}
            </p>

            <div className="grid grid-cols-2 gap-6 mt-16 pt-10 border-t border-white/10">
              <div className="flex items-start space-x-4">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Premium Courts</h4>
                  <p className="text-xs text-slate-500 mt-1">Indoor & Outdoor</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <Star className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Pro Coaches</h4>
                  <p className="text-xs text-slate-500 mt-1">Certified Experts</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Form box */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 lg:p-12 relative overflow-hidden">
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-6 left-6 z-20">
          <Link href="/" className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              CodyReserve
            </span>
          </Link>
        </div>

        <div className="w-full max-w-[440px] z-10">
          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-slate-950 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800"
              >
                <div className="mb-8">
                  <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Sign In</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Enter your credentials to access your account.</p>
                </div>
                <LoginForm
                  onSwitchToRegister={switchMode}
                  redirectTo={redirectTo}
                />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-slate-950 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800"
              >
                <div className="mb-8">
                  <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Create Account</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Join us to start booking and playing.</p>
                </div>
                <RegisterForm
                  onSwitchToLogin={switchMode}
                  redirectTo={redirectTo}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
