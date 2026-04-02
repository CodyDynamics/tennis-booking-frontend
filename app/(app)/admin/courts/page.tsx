"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route: time slots are managed under Court Management. */
export default function AdminCourtsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/court-management");
  }, [router]);
  return null;
}
