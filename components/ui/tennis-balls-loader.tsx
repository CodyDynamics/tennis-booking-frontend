"use client";

/**
 * Tennis-themed full-screen loader: dim overlay + 4 small balls that
 * shuffle positions and spin at independent speeds/directions.
 *
 * Preview locally: render `<TennisBallsLoader open />` on any page, or use
 * TennisBallsLoaderDemo below in dev.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SLOT_PX = 36;

/** Corner positions relative to center (2×2 diamond-ish square) */
const SLOTS = [
  { x: -SLOT_PX, y: -SLOT_PX },
  { x: SLOT_PX, y: -SLOT_PX },
  { x: -SLOT_PX, y: SLOT_PX },
  { x: SLOT_PX, y: SLOT_PX },
] as const;

type SlotIndex = 0 | 1 | 2 | 3;

function randomShuffleSlots(): SlotIndex[] {
  const arr: SlotIndex[] = [0, 1, 2, 3];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Mini tennis ball (~40px) — fuzzy yellow‑green + seam curves */
function TennisBallMicro({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-10 w-10 shrink-0 drop-shadow-md", className)}
      aria-hidden
    >
      <defs>
        <radialGradient id="tennis-fuzz" cx="32%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#eef9a8" />
          <stop offset="45%" stopColor="#c8e632" />
          <stop offset="100%" stopColor="#7cb518" />
        </radialGradient>
        <filter id="tennis-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#tennis-fuzz)" />
      {/* Seam curves (stylized) */}
      <path
        d="M 6 10 Q 16 16 26 10"
        fill="none"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#tennis-soft)"
      />
      <path
        d="M 6 22 Q 16 16 26 22"
        fill="none"
        stroke="rgba(255,255,255,0.88)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#tennis-soft)"
      />
      <ellipse
        cx="16"
        cy="16"
        rx="14"
        ry="14"
        fill="none"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth="1"
      />
    </svg>
  );
}

export interface TennisBallsLoaderProps {
  /** When false, nothing is rendered */
  open: boolean;
  /** Optional caption under the balls */
  message?: string;
  /** Lock scroll on body while open */
  lockScroll?: boolean;
  className?: string;
  /** z-index for overlay */
  zIndex?: number;
}

/**
 * Full viewport dim layer + 4 tennis balls swapping corners with random spins.
 */
export function TennisBallsLoader({
  open,
  message = "Loading…",
  lockScroll = true,
  className,
  zIndex = 100,
}: TennisBallsLoaderProps) {
  /** ballIndex → which slot (0–3) this ball sits in */
  const [ballToSlot, setBallToSlot] = useState<SlotIndex[]>([0, 1, 2, 3]);

  const spin = useRef(
    [0, 1, 2, 3].map(() => ({
      duration: 1.8 + Math.random() * 2.2,
      direction: Math.random() > 0.5 ? 1 : -1,
    })),
  );

  useEffect(() => {
    if (!open) return;

    const tick = () => {
      setBallToSlot((prev) => {
        let next = randomShuffleSlots();
        // Avoid no-op shuffle (all stay same) — rare for 4! but possible
        if (next.every((s, i) => s === prev[i])) {
          next = randomShuffleSlots();
        }
        return next;
      });
    };

    const id = window.setInterval(
      () => tick(),
      900 + Math.floor(Math.random() * 700),
    );
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open || !lockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockScroll]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          aria-busy="true"
          aria-live="polite"
          aria-label={message}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "fixed inset-0 flex flex-col items-center justify-center",
            className,
          )}
          style={{ zIndex }}
        >
          {/* Dim frosted layer */}
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <div className="relative flex flex-col items-center gap-6">
            {/* Soft glow behind cluster */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-3xl"
              aria-hidden
            />

            <div className="relative h-28 w-28">
              {[0, 1, 2, 3].map((ballIndex) => {
                const slot = ballToSlot[ballIndex]!;
                const pos = SLOTS[slot];
                const s = spin.current[ballIndex]!;
                return (
                  <motion.div
                    key={ballIndex}
                    className="absolute left-1/2 top-1/2 -ml-5 -mt-5"
                    initial={false}
                    animate={{ x: pos.x, y: pos.y }}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 22,
                      mass: 0.6,
                    }}
                  >
                    <motion.div
                      animate={{ rotate: s.direction * 360 }}
                      transition={{
                        duration: s.duration,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <TennisBallMicro />
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>

            {message ? (
              <motion.p
                className="relative max-w-[min(90vw,20rem)] text-center text-sm font-semibold tracking-wide text-white/90 drop-shadow-md"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {message}
              </motion.p>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Dev-only: drop on a page to try the overlay */
export function TennisBallsLoaderDemo() {
  const [on, setOn] = useState(true);
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8">
      <p className="text-muted-foreground text-center text-sm">
        Toggle để xem overlay (component demo).
      </p>
      <button
        type="button"
        className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
        onClick={() => setOn((v) => !v)}
      >
        {on ? "Ẩn loader" : "Hiện loader"}
      </button>
      <TennisBallsLoader open={on} message="Đang tải sân & lịch…" />
    </div>
  );
}
