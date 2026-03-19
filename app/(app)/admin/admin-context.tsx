"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

type Sport = "tennis" | "pickleball";

interface AdminContextType {
  sport: Sport;
  setSport: (sport: Sport) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [sport, setSportState] = useState<Sport>("tennis");

  const setSport = (newSport: Sport) => {
    setSportState(newSport);
    // Ideally update user preferences or localStorage
    localStorage.setItem("admin_sport_preference", newSport);
  };

  useEffect(() => {
    const saved = localStorage.getItem("admin_sport_preference") as Sport;
    if (saved === "tennis" || saved === "pickleball") {
      setSportState(saved);
    }
  }, []);

  return (
    <AdminContext.Provider value={{ sport, setSport }}>
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
