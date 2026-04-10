"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getSocketIoOrigin } from "@/lib/api/config";

export interface SlotKey {
  sport: string;
  courtType: string;
  date: string;
  startTime: string;
  endTime: string;
}

/** Build the lookup key used in holdCounts map. */
export function slotHoldKey(sport: string, courtType: string, date: string, startTime: string, endTime: string) {
  return `${sport}|${courtType}|${date}|${startTime}|${endTime}`;
}

interface UseSlotHoldOptions {
  locationId: string | null | undefined;
  sport: string | null;
  courtType: "indoor" | "outdoor" | null;
  date: string | null;
  displayName?: string;
  /** Called when server broadcasts availability:changed — refetch slots. */
  onAvailabilityChanged?: () => void;
}

interface UseSlotHoldResult {
  /** holdCounts["sport|courtType|date|startTime|endTime"] = number of active holds */
  holdCounts: Record<string, number>;
  /** Currently held slot key for this client (null if none) */
  myHoldKey: string | null;
  requestSlotHold: (slot: SlotKey) => void;
  releaseSlotHold: (slot: SlotKey) => void;
  notifySlotBooked: (slot: SlotKey) => void;
  connected: boolean;
}

export function useSlotHold({
  locationId,
  sport,
  courtType,
  date,
  displayName = "A guest",
  onAvailabilityChanged,
}: UseSlotHoldOptions): UseSlotHoldResult {
  const [holdCounts, setHoldCounts] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);
  const [myHoldKey, setMyHoldKey] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const onAvailRef = useRef(onAvailabilityChanged);
  onAvailRef.current = onAvailabilityChanged;

  // One-time socket setup
  useEffect(() => {
    const socket = io(`${getSocketIoOrigin()}/holds`, {
      auth: { displayName },
      transports: ["websocket"],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => {
      setConnected(false);
      setHoldCounts({});
      setMyHoldKey(null);
    });

    socket.on("slot:update", (payload: { holdCounts: Record<string, number> }) => {
      setHoldCounts(payload.holdCounts ?? {});
    });

    socket.on("availability:changed", () => {
      onAvailRef.current?.();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)join location room when locationId changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !locationId) return;

    const join = () => {
      socket.emit("join:location", { locationId });
    };

    if (socket.connected) {
      join();
    }
    socket.on("connect", join);
    return () => {
      socket.off("connect", join);
    };
  }, [locationId]);

  const requestSlotHold = useCallback((slot: SlotKey) => {
    const socket = socketRef.current;
    if (!socket || !locationId) return;

    // Release previous hold first
    if (myHoldKey) {
      const [ps, pc, pd, pst, pet] = myHoldKey.split("|");
      socket.emit("slot:hold_release", { locationId, sport: ps, courtType: pc, date: pd, startTime: pst, endTime: pet });
    }

    socket.emit("slot:hold_request", {
      locationId,
      sport: slot.sport,
      courtType: slot.courtType,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes: 0,
    });
    setMyHoldKey(slotHoldKey(slot.sport, slot.courtType, slot.date, slot.startTime, slot.endTime));
  }, [locationId, myHoldKey]);

  const releaseSlotHold = useCallback((slot: SlotKey) => {
    const socket = socketRef.current;
    if (!socket || !locationId) return;
    socket.emit("slot:hold_release", {
      locationId,
      sport: slot.sport,
      courtType: slot.courtType,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
    setMyHoldKey(null);
  }, [locationId]);

  const notifySlotBooked = useCallback((slot: SlotKey) => {
    const socket = socketRef.current;
    if (!socket || !locationId) return;
    socket.emit("slot:booked", {
      locationId,
      sport: slot.sport,
      courtType: slot.courtType,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
    setMyHoldKey(null);
  }, [locationId]);

  // Auto-release hold when sport/courtType/date changes
  useEffect(() => {
    if (myHoldKey) {
      const [ps, pc, pd, pst, pet] = myHoldKey.split("|");
      if (ps !== sport || pc !== courtType || pd !== date) {
        const socket = socketRef.current;
        if (socket && locationId) {
          socket.emit("slot:hold_release", { locationId, sport: ps, courtType: pc, date: pd, startTime: pst, endTime: pet });
        }
        setMyHoldKey(null);
      }
    }
  }, [sport, courtType, date, locationId, myHoldKey]);

  return { holdCounts, myHoldKey, requestSlotHold, releaseSlotHold, notifySlotBooked, connected };
}
