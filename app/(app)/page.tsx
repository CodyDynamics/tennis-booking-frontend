'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Trophy,
  Users,
  CalendarDays,
  Activity,
  MapPin,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePublicLocations, useBookableLocations } from '@/lib/queries';
import { useAuth } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { LogIn } from 'lucide-react';

const CommunityLocationsMap = dynamic(
  () =>
    import('@/components/map/community-locations-map').then(
      (m) => m.CommunityLocationsMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className='absolute inset-0 z-0 min-h-[320px] animate-pulse bg-muted' />
    ),
  },
);

// CodyReserve branding — hero: tennis court aerial
const HERO_BG_IMAGE =
  'https://images.unsplash.com/photo-1611916656173-875e427c2f5d?w=1920&q=80';

// Intro video: direct MP4 for reliable autoplay (muted required by browsers). Tennis courts aerial.
const INTRO_VIDEO_MP4 = 'https://assets.mixkit.co/videos/5014/5014-720.mp4';

// Fallback when partner image fails to load (neutral facility vibe)
const DEFAULT_PARTNER_IMAGE =
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=300&fit=crop&q=80';

type Partner = { name: string; logo: string; href: string; featured?: boolean };
const PARTNERS: Partner[] = [
  {
    name: 'CodyReserve',
    logo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=300&fit=crop&q=80',
    // logo: "/images/home/logo.jpeg",
    href: '#',
    featured: true,
  },
  {
    name: 'Vigor Sports',
    logo: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80',
    href: '#',
  },
  {
    name: 'Texas Region',
    logo: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop&q=80',
    href: '#',
  },
  {
    name: 'Premier Facilities',
    logo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop&q=80',
    href: '#',
  },
];

function PartnerCard({ partner }: { partner: Partner }) {
  const [imgError, setImgError] = useState(false);
  const [fallbackAlsoError, setFallbackAlsoError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const useDefault = imgError && !fallbackAlsoError;
  const src = useDefault ? DEFAULT_PARTNER_IMAGE : partner.logo;
  const showPlaceholder = fallbackAlsoError || (!imgLoaded && !imgError);
  const isFeatured = partner.featured;

  const handleImgError = () => {
    if (imgError) setFallbackAlsoError(true);
    else setImgError(true);
  };

  return (
    <a
      href={partner.href}
      className='group flex-shrink-0 w-[300px] sm:w-[320px] flex flex-col rounded-2xl overflow-hidden border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40'
      style={{
        borderColor: isFeatured
          ? 'hsl(var(--gold-accent))'
          : 'hsl(var(--border))',
        boxShadow: isFeatured
          ? '0 8px 32px hsl(var(--gold-accent) / 0.12)'
          : '0 4px 20px rgba(0,0,0,0.06)',
      }}
    >
      <div className='relative aspect-[4/3] w-full overflow-hidden bg-muted'>
        {showPlaceholder && (
          <div className='absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-primary/5'>
            <Building2 className='h-14 w-14 text-primary/60 mb-2' />
            <span className='text-xs font-medium text-muted-foreground'>
              {partner.name}
            </span>
          </div>
        )}
        {!fallbackAlsoError && (
          <Image
            src={src}
            alt={partner.name}
            fill
            className='object-cover transition-all duration-500 group-hover:scale-110'
            sizes='(max-width: 640px) 300px, 320px'
            onError={handleImgError}
            onLoad={() => setImgLoaded(true)}
          />
        )}
        <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none' />
        <div className='absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 to-transparent'>
          <span className='text-white font-bold text-sm drop-shadow-md'>
            {partner.name}
          </span>
        </div>
        {isFeatured && (
          <div className='absolute top-3 right-3 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-lg'>
            Featured
          </div>
        )}
      </div>
      <div className='p-5 bg-card border-t border-border'>
        <p className='font-bold text-foreground text-center text-lg tracking-tight'>
          {partner.name}
        </p>
        <p className='text-xs text-muted-foreground text-center mt-1'>
          Facility partner
        </p>
      </div>
    </a>
  );
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: publicLocations = [], isLoading: publicLoading } =
    usePublicLocations();
  const { data: bookableLocations, isLoading: bookableLoading } =
    useBookableLocations(isAuthenticated && !authLoading);

  const locationsForUi = useMemo(
    () => (isAuthenticated ? bookableLocations ?? [] : publicLocations),
    [isAuthenticated, bookableLocations, publicLocations],
  );

  const locationsLoading =
    authLoading || (isAuthenticated ? bookableLoading : publicLoading);

  const [showLocationSelect, setShowLocationSelect] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [reserveLoginOpen, setReserveLoginOpen] = useState(false);
  const [selectedMapLocationId, setSelectedMapLocationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (locationsForUi.length === 0) {
      setSelectedMapLocationId(null);
      return;
    }
    setSelectedMapLocationId((prev) => {
      if (prev && locationsForUi.some((l) => l.id === prev)) return prev;
      return locationsForUi[0].id;
    });
  }, [locationsForUi]);

  const goToLocationCourts = (locationId: string) => {
    router.push(`/locations/${locationId}/courts`);
  };

  const handleReserveCourtClick = () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setReserveLoginOpen(true);
      return;
    }
    setShowLocationSelect(true);
  };

  const handleLocationChosen = (locationId: string) => {
    setSelectedLocationId(locationId);
    router.push(`/locations/${locationId}/courts`);
  };

  /** Logged-in users with membership locations: show venue list without an extra click. */
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const list = bookableLocations ?? [];
    if (list.length > 0) setShowLocationSelect(true);
  }, [authLoading, isAuthenticated, bookableLocations]);

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
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <div className='min-h-screen overflow-hidden font-sans'>
      {/* Hero Section */}
      <section className='relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gradient-to-b from-[hsl(260,30%,98%)] via-white to-[hsl(210,40%,98%)] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950'>
        <div className='absolute inset-0 z-0'>
          <div
            className='absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-10'
            style={{ backgroundImage: `url(${HERO_BG_IMAGE})` }}
          />
          <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]' />
          <div className='absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-gold-accent/10 blur-[100px]' />
        </div>

        <div className='container relative z-10 mx-auto px-4 max-w-6xl'>
          <motion.div
            variants={containerVariants}
            initial='hidden'
            animate='show'
            className='text-center'
          >
            <motion.div
              variants={itemVariants}
              className='mb-6 inline-flex items-center rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-sm font-semibold text-primary backdrop-blur-sm'
            >
              <Activity className='w-4 h-4 mr-2' /> CodyReserve — Your Court,
              Your Game
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className='text-6xl md:text-8xl font-black tracking-tight mb-8 text-foreground'
            >
              Welcome to <br />
              <span className='bg-gradient-to-r from-primary via-[hsl(38,92%,50%)] to-[hsl(25,95%,47%)] bg-clip-text text-transparent'>
                CodyReserve
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className='mt-4 max-w-2xl mx-auto text-xl text-muted-foreground mb-12'
            >
              Reserve tennis and pickleball courts, hire pro coaches, and track
              your progress. Quality facilities and programs, all in one place.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className='flex flex-col sm:flex-row justify-center items-center gap-3 flex-wrap'
            >
              <Button
                type='button'
                size='lg'
                className='w-full sm:w-auto text-lg h-14 px-8 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-brand transition-all font-bold'
                onClick={handleReserveCourtClick}
              >
                Reserve <ArrowRight className='ml-2 w-5 h-5' />
              </Button>
              {showLocationSelect && isAuthenticated && (
                <Select
                  value={selectedLocationId || undefined}
                  onValueChange={handleLocationChosen}
                  disabled={
                    locationsLoading || (bookableLocations?.length ?? 0) === 0
                  }
                >
                  <SelectTrigger
                    className='w-full sm:w-[min(100%,280px)] h-14 rounded-full border-2 border-border bg-card font-bold text-foreground shadow-sm'
                    aria-label='Choose location to reserve'
                  >
                    <SelectValue
                      placeholder={
                        locationsLoading
                          ? 'Loading locations…'
                          : (bookableLocations?.length ?? 0) === 0
                            ? 'No locations available for your account'
                            : 'Choose a location'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(bookableLocations ?? []).map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Welcome / Intro — Video (autoplay muted) left, CodyReserve copy right */}
      <section className='py-16 lg:py-24 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800'>
        <div className='container mx-auto px-4 max-w-6xl'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center'>
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className='relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-slate-200 dark:bg-slate-800 ring-2 ring-slate-200 dark:ring-slate-700'
            >
              <video
                src={INTRO_VIDEO_MP4}
                autoPlay
                muted
                loop
                playsInline
                className='absolute inset-0 w-full h-full object-cover'
                title='CodyReserve intro'
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className='space-y-6'
            >
              <h2 className='text-3xl lg:text-4xl font-bold tracking-tight uppercase text-primary'>
                CodyReserve
              </h2>
              <p className='text-slate-600 dark:text-slate-300 text-lg leading-relaxed'>
                We manage and develop tennis and pickleball facilities with
                lessons, programs, tournaments, ball machines, and events.
                Choose your local CodyReserve facility to view schedules,
                reservations, and programs.
              </p>
              <Link href='/#locations'>
                <Button
                  size='lg'
                  className='bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-full px-8 font-semibold'
                >
                  About
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className='py-20 bg-muted/30 border-t border-border'>
        <div className='container mx-auto px-4 max-w-6xl'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-10'>
            <motion.div
              whileHover={{ y: -10 }}
              className='p-8 rounded-3xl bg-card border border-border shadow-soft hover:shadow-soft-lg'
            >
              <div className='w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6'>
                <CalendarDays className='w-7 h-7 text-primary' />
              </div>
              <h3 className='text-2xl font-bold mb-3 text-foreground'>
                Instant Booking
              </h3>
              <p className='text-muted-foreground'>
                Reserve top-tier courts in seconds through our seamless,
                location-based booking system.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -10 }}
              className='p-8 rounded-3xl bg-card border border-border shadow-soft hover:shadow-soft-lg'
            >
              <div className='w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6'>
                <Users className='w-7 h-7 text-primary' />
              </div>
              <h3 className='text-2xl font-bold mb-3 text-foreground'>
                Pro Coaching
              </h3>
              <p className='text-muted-foreground'>
                Connect with certified tennis and pickleball professionals to
                elevate your skills.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -10 }}
              className='p-8 rounded-3xl bg-card border border-border shadow-soft hover:shadow-soft-lg'
            >
              <div className='w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6'>
                <Trophy className='w-7 h-7 text-primary' />
              </div>
              <h3 className='text-2xl font-bold mb-3 text-foreground'>
                Track Progress
              </h3>
              <p className='text-muted-foreground'>
                Monitor your stats with comprehensive coaching reports.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Partners — auto-scrolling slider (infinite loop) */}
      <section className='py-20 bg-card border-t border-border overflow-hidden'>
        <div className='container mx-auto px-4 max-w-6xl'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className='text-center mb-12'
          >
            <h2 className='text-3xl lg:text-4xl font-bold text-foreground mb-4'>
              Our Partners
            </h2>
            <p className='text-muted-foreground max-w-2xl mx-auto'>
              We work with leading organizations and facilities to bring you the
              best courts and programs.
            </p>
          </motion.div>
        </div>
        <div className='relative w-full overflow-hidden'>
          <div className='flex w-max flex-nowrap animate-scroll-partners gap-6 pl-4 pr-4'>
            {[...PARTNERS, ...PARTNERS].map((partner, i) => (
              <PartnerCard key={`${partner.name}-${i}`} partner={partner} />
            ))}
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section
        id='locations'
        className='py-16 lg:py-20 bg-slate-50 dark:bg-slate-950'
      >
        <div className='container mx-auto px-4 max-w-6xl'>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className='text-2xl md:text-3xl font-bold text-center uppercase tracking-wide mb-4 text-primary'
          >
            CodyReserve — Quality Courts Across Our Communities
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className='text-center text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto'
          >
            Find a location near you. Select a facility to view courts and book.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className='rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl'
          >
            <div className='aspect-[21/9] min-h-[320px] w-full relative isolate'>
              <CommunityLocationsMap
                locations={locationsForUi}
                selectedLocationId={selectedMapLocationId}
              />
            </div>
            {locationsForUi.length > 0 && (
              <div className='p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800'>
                <p className='text-center text-xs text-muted-foreground mb-3'>
                  Tap a location to show demo court markers (fictional
                  addresses).
                </p>
                <div className='flex flex-wrap justify-center gap-4'>
                  {locationsForUi.slice(0, 6).map((loc) => (
                    <div
                      key={loc.id}
                      className='flex flex-col items-center gap-1.5 min-w-[140px]'
                    >
                      <button
                        type='button'
                        onClick={() =>
                          setSelectedMapLocationId((prev) =>
                            prev === loc.id ? null : loc.id,
                          )
                        }
                        className={cn(
                          'inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors w-full justify-center',
                          selectedMapLocationId === loc.id
                            ? 'bg-primary text-primary-foreground shadow-brand'
                            : 'bg-primary/10 text-primary hover:bg-primary/20',
                        )}
                      >
                        <MapPin className='w-4 h-4 shrink-0' />
                        {loc.name}
                      </button>
                      <Link
                        href={`/locations/${loc.id}/courts`}
                        className='text-xs font-semibold text-primary hover:underline'
                      >
                        View courts →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <Dialog open={reserveLoginOpen} onOpenChange={setReserveLoginOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Sign in to reserve</DialogTitle>
            <DialogDescription>
              Please sign in to see locations you can book. Public facilities
              are available to everyone; private clubs only appear if you have
              an active membership.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setReserveLoginOpen(false)}
            >
              Cancel
            </Button>
            <Button type='button' asChild className='shadow-brand'>
              <Link
                href='/login?next=%2F'
                onClick={() => setReserveLoginOpen(false)}
              >
                <LogIn className='mr-2 h-4 w-4' />
                Go to sign in
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
