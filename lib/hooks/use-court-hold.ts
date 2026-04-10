"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth-store";
import { getSocketIoOrigin } from "@/lib/api/config";
import toast from "react-hot-toast";

export interface HoldEntry {
  socketId: string;
  displayName: string;
  lockedAt: string;
  expiresAt: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
}

/** Map key: "{courtId}:{date}:{startTime}:{endTime}" */
export type HoldsMap = Record<string, HoldEntry>;

export interface SlotRef {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  courtName?: string;
}

export function holdKey(ref: Pick<SlotRef, "courtId" | "date" | "startTime" | "endTime">) {
  return `${ref.courtId}:${ref.date}:${ref.startTime}:${ref.endTime}`;
}

export interface UseCourtHoldOptions {
  locationId: string;
  courtIds: string[];
  enabled?: boolean;
  /** Called when any user in the room successfully books a court (trigger refetch). */
  onAvailabilityChanged?: () => void;
}

export function useCourtHold({ locationId, courtIds, enabled = true, onAvailabilityChanged }: UseCourtHoldOptions) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [holds, setHolds] = useState<HoldsMap>({});
  const [connected, setConnected] = useState(false);
  /** Track the current hold we own so we can release it on unmount / deselect. */
  const myHoldRef = useRef<SlotRef | null>(null);
  const courtIdsRef = useRef<string[]>(courtIds);
  useEffect(() => { courtIdsRef.current = courtIds; }, [courtIds]);
  const onAvailabilityChangedRef = useRef(onAvailabilityChanged);
  useEffect(() => { onAvailabilityChangedRef.current = onAvailabilityChanged; }, [onAvailabilityChanged]);

  useEffect(() => {
    if (!enabled || !locationId) return;

    const displayName = user?.fullName ?? user?.email ?? "Guest";
    const socket = io(`${getSocketIoOrigin()}/holds`, {
      withCredentials: true,
      auth: { displayName },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      // Join with current courtIds (may be empty on first connect; re-join happens below when they load)
      socket.emit("join:location", { locationId, courtIds: courtIdsRef.current });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("hold:update", (payload: { holds: HoldsMap }) => {
      setHolds(payload.holds ?? {});
    });

    socket.on("hold:denied", (payload: { courtName: string; heldBy: string }) => {
      toast.error(`"${payload.courtName}" is currently held by ${payload.heldBy}. Please pick another court.`);
    });

    socket.on("availability:changed", () => {
      onAvailabilityChangedRef.current?.();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, locationId, user?.id]);

  /**
   * Re-join when courtIds first become available (empty → populated after availability loads).
   * We track the previous courtIds length so we only re-join when the list actually changes,
   * avoiding duplicate join events on every render.
   */
  const prevCourtIdsLenRef = useRef<number>(0);
  useEffect(() => {
    if (!connected || !socketRef.current || !locationId) return;
    if (courtIds.length === prevCourtIdsLenRef.current) return; // no real change
    prevCourtIdsLenRef.current = courtIds.length;
    socketRef.current.emit("join:location", { locationId, courtIds });
  }, [connected, locationId, courtIds]);

  const requestHold = useCallback(
    (slot: SlotRef) => {
      if (!socketRef.current?.connected) return;
      // Release previous hold first
      if (myHoldRef.current) {
        const prev = myHoldRef.current;
        socketRef.current.emit("hold:release", {
          courtId: prev.courtId,
          date: prev.date,
          startTime: prev.startTime,
          endTime: prev.endTime,
          locationId,
          courtIds: courtIdsRef.current,
        });
      }
      myHoldRef.current = slot;
      socketRef.current.emit("hold:request", {
        ...slot,
        locationId,
        courtIds: courtIdsRef.current,
      });
    },
    [locationId],
  );

  /** Emits court:booked so the server can broadcast availability:changed to all room members. */
  const notifyBooked = useCallback(
    (slot: SlotRef) => {
      if (!socketRef.current?.connected) return;
      socketRef.current.emit("court:booked", {
        courtId: slot.courtId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        locationId,
        courtIds: courtIdsRef.current,
      });
    },
    [locationId],
  );

  const releaseHold = useCallback(
    (slot?: SlotRef) => {
      const target = slot ?? myHoldRef.current;
      if (!target || !socketRef.current?.connected) return;
      socketRef.current.emit("hold:release", {
        courtId: target.courtId,
        date: target.date,
        startTime: target.startTime,
        endTime: target.endTime,
        locationId,
        courtIds: courtIdsRef.current,
      });
      if (!slot || holdKey(slot) === holdKey(myHoldRef.current!)) {
        myHoldRef.current = null;
      }
    },
    [locationId],
  );

  const isHeldByMe = useCallback(
    (ref: Pick<SlotRef, "courtId" | "date" | "startTime" | "endTime">) =>
      myHoldRef.current ? holdKey(myHoldRef.current) === holdKey(ref) : false,
    [],
  );

  const isHeldByOther = useCallback(
    (ref: Pick<SlotRef, "courtId" | "date" | "startTime" | "endTime">) => {
      const entry = holds[holdKey(ref)];
      if (!entry) return false;
      return entry.socketId !== socketRef.current?.id;
    },
    [holds],
  );

  const getHoldEntry = useCallback(
    (ref: Pick<SlotRef, "courtId" | "date" | "startTime" | "endTime">) =>
      holds[holdKey(ref)] ?? null,
    [holds],
  );

  return {
    holds,
    connected,
    requestHold,
    releaseHold,
    notifyBooked,
    isHeldByMe,
    isHeldByOther,
    getHoldEntry,
  };
}
