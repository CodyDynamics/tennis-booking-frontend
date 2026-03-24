"use client";

import { useEffect, useState } from "react";

interface HoldCountdownProps {
  expiresAt: string; // ISO string
  className?: string;
}

export function HoldCountdown({ expiresAt, className }: HoldCountdownProps) {
  const [secsLeft, setSecsLeft] = useState(() =>
    Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSecsLeft(Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;
  const label = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <span className={className}>
      {secsLeft === 0 ? "Expired" : label}
    </span>
  );
}
