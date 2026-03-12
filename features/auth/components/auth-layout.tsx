"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import Link from "next/link";
import { Circle, Activity, Trophy, Star } from "lucide-react";

type AuthMode = "login" | "register";

interface AuthLayoutProps {
  initialMode?: AuthMode;
}

export function AuthLayout({ initialMode = "login" }: AuthLayoutProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate fixed positions for confetti stars to avoid hydration mismatch
  const confettiPositions = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      top: (i * 12.5 + 10) % 100, // Fixed positions based on index
      left: (i * 15 + 20) % 100,
      delay: i * 0.3,
      duration: 3 + (i % 3) * 0.5,
      xOffset: (i % 5) * 4 - 8,
    }));
  }, []);

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
  };

  return (
    <div className="flex min-h-screen relative">
      {/* Left Panel - Tennis Illustration */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating tennis balls */}
          <motion.div
            animate={{
              y: [0, -20, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-20 left-20"
          >
            <Circle className="h-16 w-16 text-white/30 fill-white/30" />
          </motion.div>
          <motion.div
            animate={{
              y: [0, 30, 0],
              rotate: [360, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute bottom-32 right-32"
          >
            <Circle className="h-12 w-12 text-white/20 fill-white/20" />
          </motion.div>
          <motion.div
            animate={{
              y: [0, -15, 0],
              rotate: [0, -360],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
            className="absolute top-1/2 right-20"
          >
            <Activity className="h-20 w-20 text-white/25" />
          </motion.div>
          
          {/* Confetti-like shapes */}
          {mounted && confettiPositions.map((pos, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -30, 0],
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
              <Star className="h-4 w-4 text-white/20" />
            </motion.div>
          ))}
        </div>

        {/* Logo */}
        <div className="absolute top-6 left-6 z-20">
          <Link href="/" className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-white" />
            <span className="text-xl font-bold text-white">Tennis Booking</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col justify-center items-center px-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-6"
          >
            <div className="flex justify-center mb-8">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Activity className="h-32 w-32 text-white" />
              </motion.div>
            </div>
            
            <h2 className="text-4xl font-bold">
              {mode === "login" ? "Welcome Back!" : "Join Us Today!"}
            </h2>
            
            <p className="text-xl text-blue-100 max-w-md mx-auto">
              {mode === "login"
                ? "Book your favorite tennis court and improve your game with professional coaching."
                : "Start your tennis journey with our premium courts and expert coaches."}
            </p>

            <div className="flex items-center justify-center gap-6 mt-12">
              <div className="text-center">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-300" />
                <p className="text-sm text-blue-100">Premium Courts</p>
              </div>
              <div className="text-center">
                <Star className="h-8 w-8 mx-auto mb-2 text-yellow-300" />
                <p className="text-sm text-blue-100">Expert Coaches</p>
              </div>
              <div className="text-center">
                <Circle className="h-8 w-8 mx-auto mb-2 text-yellow-300 fill-yellow-300" />
                <p className="text-sm text-blue-100">Track Progress</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-white p-4 lg:p-8">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <LoginForm onSwitchToRegister={switchMode} />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <RegisterForm onSwitchToLogin={switchMode} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
