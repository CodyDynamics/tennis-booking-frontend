"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Sport = string;

const STORAGE_SPORT = "admin_sport_preference";
const STORAGE_LOCATION = "admin_location_scope";

interface AdminContextType {
  sport: Sport;
  setSport: (sport: Sport) => void;
  /** "all" or a location UUID — filters list pages that respect admin scope */
  locationId: string;
  setLocationId: (id: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [sport, setSportState] = useState<Sport>("tennis");
  const [locationId, setLocationIdState] = useState<string>("all");

  const setSport = (newSport: Sport) => {
    setSportState(newSport);
    localStorage.setItem(STORAGE_SPORT, newSport);
  };

  const setLocationId = (id: string) => {
    setLocationIdState(id);
    localStorage.setItem(STORAGE_LOCATION, id);
  };

  useEffect(() => {
    const savedSport = localStorage.getItem(STORAGE_SPORT);
    if (savedSport) setSportState(savedSport);
    const savedLoc = localStorage.getItem(STORAGE_LOCATION);
    if (savedLoc) setLocationIdState(savedLoc);
  }, []);

  return (
    <AdminContext.Provider value={{ sport, setSport, locationId, setLocationId }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
