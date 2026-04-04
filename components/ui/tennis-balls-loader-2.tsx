"use client";

/**
 * Alternate full-screen loader: four balls in a horizontal row, swapping along
 * smooth upper/lower arcs with a warm glow (light-like motion).
 */

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useRef, useState, useId } from "react";
import { cn } from "@/lib/utils";

const SLOT_X = [-72, -24, 24, 72] as const;
const ARC_HEIGHT = 32;
const BALL_SHIFT = 20;

type SlotIndex = 0 | 1 | 2 | 3;

const SWAP_PATTERNS: SlotIndex[][] = [
  [2, 3, 0, 1],
  [0, 1, 2, 3],
  [1, 0, 3, 2],
  [3, 2, 1, 0],
  [2, 0, 3, 1],
  [1, 3, 0, 2],
];

function pickNextPattern(current: SlotIndex[]): SlotIndex[] {
  const candidates = SWAP_PATTERNS.filter(
    (p) => !p.every((slot, i) => slot === current[i]),
  );
  return candidates[Math.floor(Math.random() * candidates.length)] ?? SWAP_PATTERNS[0]!;
}

function TennisBallMicroV2({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const gid = `tennis-fuzz-v2-${uid}`;
  const fid = `tennis-soft-v2-${uid}`;

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-10 w-10 shrink-0", className)}
      aria-hidden
    >
      <defs>
        <radialGradient id={gid} cx="32%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#fffef0" />
          <stop offset="40%" stopColor="#ffe066" />
          <stop offset="70%" stopColor="#f5a623" />
          <stop offset="100%" stopColor="#c45a10" />
        </radialGradient>
        <filter id={fid} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.35" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="16" cy="16" r="14" fill={`url(#${gid})`} />
      <path
        d="M 6 10 Q 16 16 26 10"
        fill="none"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="2"
        strokeLinecap="round"
        filter={`url(#${fid})`}
      />
      <path
        d="M 6 22 Q 16 16 26 22"
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="2"
        strokeLinecap="round"
        filter={`url(#${fid})`}
      />
      <ellipse
        cx="16"
        cy="16"
        rx="14"
        ry="14"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />
    </svg>
  );
}

function BallLightShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-10 w-10 items-center justify-center">
      <div
        className="pointer-events-none absolute inset-0 scale-[1.85] rounded-full bg-primary/35 blur-xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 scale-150 rounded-full bg-amber-200/30 blur-md dark:bg-amber-400/20"
        aria-hidden
      />
      <div className="relative z-[1] drop-shadow-[0_0_12px_rgba(245,166,35,0.85)]">
        {children}
      </div>
    </div>
  );
}

export interface TennisBallsLoader2Props {
  open: boolean;
  message?: string;
  lockScroll?: boolean;
  className?: string;
  zIndex?: number;
}

export function TennisBallsLoader2({
  open,
  message = "Loading…",
  lockScroll = true,
  className,
  zIndex = 100,
}: TennisBallsLoader2Props) {
  const [ballToSlot, setBallToSlot] = useState<SlotIndex[]>([0, 1, 2, 3]);
  const fromSnapshotRef = useRef<SlotIndex[]>([0, 1, 2, 3]);

  const spin = useRef(
    [0, 1, 2, 3].map(() => ({
      duration: 2.4 + Math.random() * 2,
      direction: Math.random() > 0.5 ? 1 : -1,
    })),
  );

  useEffect(() => {
    if (!open) return;

    const tick = () => {
      setBallToSlot((prev) => pickNextPattern(prev));
    };

    const id = window.setInterval(
      () => tick(),
      1100 + Math.floor(Math.random() * 500),
    );
    return () => window.clearInterval(id);
  }, [open]);

  const MOVE_MS = 780;
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      fromSnapshotRef.current = [...ballToSlot];
    }, MOVE_MS);
    return () => window.clearTimeout(timer);
  }, [ballToSlot, open]);

  useEffect(() => {
    if (!open || !lockScroll) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
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
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <div className="relative flex flex-col items-center gap-8">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl"
              aria-hidden
            />

            <div className="relative h-24 w-[220px]">
              <div
                className="pointer-events-none absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                aria-hidden
              />

              {[0, 1, 2, 3].map((ballIndex) => {
                const fromSlot = fromSnapshotRef.current[ballIndex]!;
                const toSlot = ballToSlot[ballIndex]!;
                const fromX = SLOT_X[fromSlot];
                const toX = SLOT_X[toSlot];
                const midX = (fromX + toX) / 2;
                const arcY =
                  toSlot === fromSlot ? 0 : toSlot > fromSlot ? -ARC_HEIGHT : ARC_HEIGHT;
                const sameSlot = fromSlot === toSlot;

                return (
                  <motion.div
                    key={ballIndex}
                    className="absolute left-1/2 top-1/2"
                    style={{
                      marginLeft: -BALL_SHIFT,
                      marginTop: -BALL_SHIFT,
                    }}
                    initial={false}
                    animate={
                      sameSlot
                        ? { x: toX, y: 0 }
                        : {
                            x: [fromX, midX, toX],
                            y: [0, arcY, 0],
                          }
                    }
                    transition={
                      sameSlot
                        ? { duration: 0.35, ease: [0.33, 1, 0.68, 1] }
                        : {
                            duration: 0.72,
                            times: [0, 0.5, 1],
                            ease: [
                              [0.22, 1, 0.36, 1],
                              [0.45, 0, 0.55, 1],
                            ],
                          }
                    }
                  >
                    <motion.div
                      animate={{ rotate: spin.current[ballIndex]!.direction * 360 }}
                      transition={{
                        duration: spin.current[ballIndex]!.duration,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <BallLightShell>
                        <TennisBallMicroV2 />
                      </BallLightShell>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>

            {message ? (
              <motion.p
                className="relative max-w-[min(90vw,20rem)] text-center text-sm font-semibold tracking-wide text-white/90 drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]"
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

export function TennisBallsLoader2Demo() {
  const [on, setOn] = useState(false);
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8">
      <p className="text-center text-sm text-muted-foreground">
        Toggle to preview the horizontal arc loader (variant 2).
      </p>
      <button
        type="button"
        className="rounded-full bg-primary hover:bg-primary-hover px-5 py-2 text-sm font-bold text-primary-foreground"
        onClick={() => setOn((v) => !v)}
      >
        {on ? "Hide loader" : "Show loader"}
      </button>
      <TennisBallsLoader2 open={on} message="Loading courts and schedule…" />
    </div>
  );
}
