"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Users, Calendar } from "lucide-react";
import { useCourt, useLocationMembership } from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { CourtBookingModal } from "@/features/courts/components/court-booking-modal";
import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";

const DEFAULT_COACH_AVATAR =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&q=80";

const DEFAULT_COURT_IMAGE =
  "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80";

function GalleryImage({
  src,
  alt,
  fallbackSrc,
}: {
  src: string;
  alt: string;
  fallbackSrc: string;
}) {
  const [err, setErr] = useState(false);
  const actualSrc = err ? fallbackSrc : src;
  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
      <Image
        src={actualSrc}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
        onError={() => setErr(true)}
      />
    </div>
  );
}

function CoachAvatar({
  src,
  alt,
  fallbackSrc,
}: {
  src: string;
  alt: string;
  fallbackSrc: string;
}) {
  const [err, setErr] = useState(false);
  const actualSrc = err ? fallbackSrc : src;
  return (
    <div className="relative w-14 h-14 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
      <Image
        src={actualSrc}
        alt={alt}
        fill
        className="object-cover"
        sizes="56px"
        onError={() => setErr(true)}
      />
    </div>
  );
}

export default function CourtDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationId = params.locationId as string;
  const courtId = params.courtId as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  const queryEnabled = !authLoading && isAuthenticated && !!courtId;

  const { data: court, isLoading, error } = useCourt(courtId, {
    enabled: queryEnabled,
  });

  const { data: locationAccess, isLoading: loadingLocationAccess } = useLocationMembership(
    locationId,
    { enabled: queryEnabled },
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      const nextPath =
        pathname && pathname.startsWith("/") && !pathname.startsWith("//")
          ? pathname
          : `/locations/${locationId}/courts/${courtId}`;
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }, [authLoading, isAuthenticated, router, pathname, locationId, courtId]);
  const coaches = court?.coaches ?? [];
  const galleryUrls: string[] = useMemo(() => {
    if (!court?.imageGallery?.length) return [];
    return Array.isArray(court.imageGallery) ? court.imageGallery : [];
  }, [court?.imageGallery]);

  const bannerUrl = court?.imageUrl || (galleryUrls[0] ?? null);

  if (authLoading || !isAuthenticated) {
    return <GlobalLoadingPlaceholder minHeight="min-h-screen" />;
  }

  if (isLoading || loadingLocationAccess) {
    return <GlobalLoadingPlaceholder minHeight="min-h-screen" />;
  }

  const prefillDate = searchParams.get("prefillDate");
  const prefillStart = searchParams.get("prefillStart");
  const prefillEnd = searchParams.get("prefillEnd");

  if (error || !court) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-7xl text-center">
        <p className="text-muted-foreground">Court not found.</p>
        <Link href={`/locations/${locationId}/courts`}>
          <Button variant="outline" className="mt-4 rounded-full">
            Back to Courts
          </Button>
        </Link>
      </div>
    );
  }

  if (court.locationId && court.locationId !== locationId) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-7xl text-center">
        <p className="text-muted-foreground">This court does not belong to this location.</p>
        <Link href="/">
          <Button variant="outline" className="mt-4 rounded-full">
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  if (
    locationAccess?.visibility === "private" &&
    !locationAccess.hasActiveMembership
  ) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-lg text-center">
        <h1 className="text-2xl font-bold mb-2">Members only</h1>
        <p className="text-muted-foreground mb-6">
          This court is at a private club. You need an active membership to view it.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {prefillDate && prefillStart && prefillEnd && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-3 text-center text-sm text-amber-900 dark:text-amber-100">
          From the booking wizard:{" "}
          <strong>
            {prefillDate} {prefillStart}–{prefillEnd}
          </strong>
          . Tap <strong>Book this Court</strong> below and choose the same slot to confirm.
        </div>
      )}
      {/* Banner fullwidth + title/description overlay */}
      <section className="relative w-full min-h-[320px] md:min-h-[420px] bg-slate-900">
        {bannerUrl && !bannerError ? (
          <Image
            src={bannerUrl}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            onError={() => setBannerError(true)}
          />
        ) : bannerError ? (
          <Image
            src={DEFAULT_COURT_IMAGE}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="container mx-auto px-4 max-w-7xl relative z-10 flex flex-col justify-end min-h-[320px] md:min-h-[420px] pb-12 pt-24">
          <Link href={`/locations/${locationId}/courts`}>
            <Button
              variant="secondary"
              className="absolute top-6 left-4 rounded-full bg-white/10 hover:bg-white/20 text-white border-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Courts
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mt-8">
            {court.name}
          </h1>
          <p className="text-lg md:text-xl text-white/90 mt-2 max-w-2xl drop-shadow">
            {court.description || "Premium court for tennis and pickleball."}
          </p>
          <div className="flex flex-wrap gap-4 mt-4 text-white/80 text-sm">
            <span className="capitalize">
              {court.courtTypes?.length
                ? court.courtTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")
                : court.type}
            </span>
            <span>•</span>
            <span className="capitalize">
              {court.sports?.length ? court.sports.join(", ") : court.sport}
            </span>
            {court.locationName && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {court.locationName}
                </span>
              </>
            )}
          </div>
          {court.status === "active" && (
            <Button
              size="lg"
              className="mt-6 rounded-full bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-xl px-8"
              onClick={() => setBookingModalOpen(true)}
            >
              <Calendar className="mr-2 h-5 w-5" />
              Book this Court
            </Button>
          )}
        </div>
      </section>

      <CourtBookingModal
        court={court}
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
      />

      {/* Gallery */}
      {galleryUrls.length > 0 && (
        <section className="container mx-auto px-4 max-w-7xl py-12">
          <h2 className="text-2xl font-bold mb-6">Gallery</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleryUrls.map((url, i) => (
              <GalleryImage
                key={i}
                src={url}
                alt={`Court ${i + 1}`}
                fallbackSrc={DEFAULT_COURT_IMAGE}
              />
            ))}
          </div>
        </section>
      )}

      {/* Our members / Coaches */}
      <section className="container mx-auto px-4 max-w-7xl py-12 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Users className="h-6 w-6" /> Our Coaches
        </h2>
        {coaches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coaches.map((coach) => (
              <div
                key={coach.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <CoachAvatar
                    src={coach.user?.avatarUrl || DEFAULT_COACH_AVATAR}
                    alt={coach.user?.fullName ?? "Coach"}
                    fallbackSrc={DEFAULT_COACH_AVATAR}
                  />
                  <div>
                    <p className="font-semibold text-lg">
                      {coach.user?.fullName ?? "Coach"}
                    </p>
                    {coach.experienceYears > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {coach.experienceYears} years experience
                      </p>
                    )}
                    {coach.bio && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {coach.bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No coaches listed for this location yet.</p>
        )}
      </section>

      {/* Google Maps embed */}
      {court.mapEmbedUrl && (
        <section className="container mx-auto px-4 max-w-7xl py-12 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <MapPin className="h-6 w-6" /> Location
          </h2>
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video max-h-[480px]">
            <iframe
              src={court.mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 400 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Court location map"
              className="w-full h-full min-h-[400px]"
            />
          </div>
        </section>
      )}
    </div>
  );
}
