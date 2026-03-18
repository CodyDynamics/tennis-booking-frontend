"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Shield, ArrowRight, Activity, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminOverviewPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">Manage courts, user accounts, and system permissions.</p>
        </div>
        <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">System Online</span>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <motion.div variants={itemVariants}>
          <Link href="/admin/courts" className="block h-full">
            <div className="group h-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
              
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                <MapPin className="h-6 w-6" />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Courts</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Create, edit, and orchestrate physical facilities and dynamic time slots.</p>
              
              <div className="flex items-center text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-1 transition-transform">
                Manage courts <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link href="/admin/users" className="block h-full">
            <div className="group h-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
              
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30">
                <Users className="h-6 w-6" />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Users</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Administrate user databases, review activity, and assign roles.</p>
              
              <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">
                Manage users <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link href="/admin/roles" className="block h-full">
            <div className="group h-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
              
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
                <Shield className="h-6 w-6" />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Control</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Architect RBAC policies to determine platform permissions globally.</p>
              
              <div className="flex items-center text-purple-600 dark:text-purple-400 font-bold group-hover:translate-x-1 transition-transform">
                Manage roles <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>
          </Link>
        </motion.div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-12 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-lg"
      >
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Activity className="text-blue-500" /> Platform Insights</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/50">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Courts</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">--</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/50">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Bookings</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">--</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/50">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Users</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">--</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/50">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Active Time Slots</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">--</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
