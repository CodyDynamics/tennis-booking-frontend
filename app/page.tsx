"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, Users, CalendarDays, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
           {/* Modern Abstract Sports Background */}
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />
           <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-green-500/20 blur-[100px]" />
           <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[40%] rounded-full bg-purple-500/20 blur-[100px]" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 max-w-6xl">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="text-center"
          >
            <motion.div variants={itemVariants} className="mb-6 inline-flex items-center rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/30 px-3 py-1 text-sm font-semibold text-blue-600 dark:text-blue-400 backdrop-blur-sm">
              <Activity className="w-4 h-4 mr-2" /> Premiere Sports Booking Platform
            </motion.div>
            
            <motion.h1 
              variants={itemVariants} 
              className="text-6xl md:text-8xl font-black tracking-tight mb-8 text-slate-900 dark:text-white"
            >
              Elevate Your <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-green-500 bg-clip-text text-transparent">
                Game Experience
              </span>
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              className="mt-4 max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-300 mb-12"
            >
              Book premium tennis and pickleball courts, hire professional coaches, and manage your progress. All in one beautifully simple platform.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/courts">
                <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all font-bold">
                  Book a Court <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/coaches">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 rounded-full border-2 border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 transition-all font-bold">
                  Find a Coach
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <motion.div 
              whileHover={{ y: -10 }}
              className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-lg"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-6">
                <CalendarDays className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Instant Booking</h3>
              <p className="text-slate-600 dark:text-slate-300">Reserve top-tier courts in seconds through our seamless, intuitive location-based booking system.</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -10 }}
              className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-lg"
            >
              <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Pro Coaching</h3>
              <p className="text-slate-600 dark:text-slate-300">Connect with certified tennis and pickleball professionals to elevate your skills and stamina.</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -10 }}
              className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-lg"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mb-6">
                <Trophy className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Track Progress</h3>
              <p className="text-slate-600 dark:text-slate-300">Monitor your forehand, backhand, footwork, and overall stats with comprehensive coaching reports.</p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
