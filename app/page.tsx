"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Trophy,
  Users,
  CalendarDays,
  Activity,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocations } from "@/lib/queries";

// CodyReserve branding — hero: tennis court aerial
const HERO_BG_IMAGE =
  "https://images.unsplash.com/photo-1611916656173-875e427c2f5d?w=1920&q=80";

// Intro video: direct MP4 for reliable autoplay (muted required by browsers). Tennis courts aerial.
const INTRO_VIDEO_MP4 =
  "https://assets.mixkit.co/videos/5014/5014-720.mp4";

const MAP_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d214587.225799977!2d-97.0!3d32.8!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x864c3e0e575776b5%3A0x2a0e3da9a2e2e2e2!2sDallas-Fort%20Worth%20Metroplex!5e0!3m2!1sen!2sus!4v1234567890";

type Partner = { name: string; logo: string; href: string; featured?: boolean };
const PARTNERS: Partner[] = [
  {
    name: "CodyReserve",
    logo: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=200&h=140&fit=crop",
    href: "#",
    featured: true,
  },
  {
    name: "Vigor Sports",
    logo: "https://images.unsplash.com/photo-1622163642998-1ee2d2e71c2a?w=200&h=140&fit=crop",
    href: "#",
  },
  {
    name: "Texas Region",
    logo: "https://images.unsplash.com/photo-1595435933710-7115915394ef?w=200&h=140&fit=crop",
    href: "#",
  },
  {
    name: "Premier Facilities",
    logo: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=140&fit=crop",
    href: "#",
  },
];

export default function Home() {
  const { data: locations = [] } = useLocations();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen overflow-hidden font-sans">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gradient-to-b from-[hsl(260,30%,98%)] via-white to-[hsl(210,40%,98%)] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-10"
            style={{ backgroundImage: `url(${HERO_BG_IMAGE})` }}
          />
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-gold-accent/10 blur-[100px]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 max-w-6xl">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="text-center"
          >
            <motion.div
              variants={itemVariants}
              className="mb-6 inline-flex items-center rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-sm font-semibold text-primary backdrop-blur-sm"
            >
              <Activity className="w-4 h-4 mr-2" /> CodyReserve — Your Court,
              Your Game
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-6xl md:text-8xl font-black tracking-tight mb-8 text-foreground"
            >
              Welcome to <br />
              <span className="bg-gradient-to-r from-primary via-[hsl(38,92%,50%)] to-[hsl(25,95%,47%)] bg-clip-text text-transparent">
                CodyReserve
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-4 max-w-2xl mx-auto text-xl text-muted-foreground mb-12"
            >
              Book tennis and pickleball courts, hire pro coaches, and track
              your progress. Quality facilities and programs, all in one place.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Link href="/coaches">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-lg h-14 px-8 rounded-full bg-primary hover:opacity-90 text-primary-foreground shadow-brand transition-all font-bold"
                >
                  Find a Coach <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/booking-history">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-lg h-14 px-8 rounded-full border-2 border-border bg-card hover:bg-muted font-bold text-foreground"
                >
                  Booking History
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Welcome / Intro — Video (autoplay muted) left, CodyReserve copy right */}
      <section className="py-16 lg:py-24 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-slate-200 dark:bg-slate-800 ring-2 ring-slate-200 dark:ring-slate-700"
            >
              <video
                src={INTRO_VIDEO_MP4}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                title="CodyReserve intro"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight uppercase text-primary">
                CodyReserve
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                We manage and develop tennis and pickleball facilities with
                lessons, programs, tournaments, ball machines, and events.
                Choose your local CodyReserve facility to view schedules,
                reservations, and programs.
              </p>
              <Link href="/#locations">
                <Button
                  size="lg"
                  className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-full px-8 font-semibold"
                >
                  About
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30 border-t border-border">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <motion.div
              whileHover={{ y: -10 }}
              className="p-8 rounded-3xl bg-card border border-border shadow-soft hover:shadow-soft-lg"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <CalendarDays className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">Instant Booking</h3>
              <p className="text-muted-foreground">
                Reserve top-tier courts in seconds through our seamless,
                location-based booking system.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -10 }}
              className="p-8 rounded-3xl bg-card border border-border shadow-soft hover:shadow-soft-lg"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">Pro Coaching</h3>
              <p className="text-muted-foreground">
                Connect with certified tennis and pickleball professionals to
                elevate your skills.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -10 }}
              className="p-8 rounded-3xl bg-card border border-border shadow-soft hover:shadow-soft-lg"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Trophy className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">Track Progress</h3>
              <p className="text-muted-foreground">
                Monitor your stats with comprehensive coaching reports.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Partners — auto-scrolling slider (infinite loop) */}
      <section className="py-20 bg-card border-t border-border overflow-hidden">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Our Partners
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We work with leading organizations and facilities to bring you the
              best courts and programs.
            </p>
          </motion.div>
        </div>
        <div className="relative w-full overflow-hidden">
          <div className="flex w-max flex-nowrap animate-scroll-partners gap-6 pl-4 pr-4">
            {[...PARTNERS, ...PARTNERS].map((partner, i) => (
              <a
                key={`${partner.name}-${i}`}
                href={partner.href}
                className="group flex-shrink-0 w-[280px] flex flex-col items-center p-6 rounded-2xl border bg-muted/50 transition-all hover:shadow-lg"
                style={{
                  borderColor: partner.featured
                    ? "hsl(var(--gold-accent))"
                    : "hsl(var(--border))",
                  boxShadow: partner.featured
                    ? "0 4px 20px hsl(var(--gold-accent) / 0.15)"
                    : undefined,
                }}
              >
                <div className="w-full aspect-[4/3] max-w-[160px] rounded-xl overflow-hidden mb-3 bg-muted">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <span className="font-bold text-foreground text-center">
                  {partner.name}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section id="locations" className="py-16 lg:py-20 bg-slate-50 dark:bg-slate-950">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-center uppercase tracking-wide mb-4 text-primary"
          >
            CodyReserve — Quality Courts Across Our Communities
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto"
          >
            Find a location near you. Select a facility to view courts and
            book.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl"
          >
            <div className="aspect-[21/9] min-h-[320px] w-full relative">
              <iframe
                src={MAP_EMBED_URL}
                title="Our locations map"
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            {locations.length > 0 && (
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-center gap-3">
                {locations.slice(0, 6).map((loc) => (
                  <Link
                    key={loc.id}
                    href={`/locations/${loc.id}/courts`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    {loc.name}
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
