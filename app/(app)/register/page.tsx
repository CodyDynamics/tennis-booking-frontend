"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";

function RegisterWithNext() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  return <AuthLayout initialMode="register" redirectTo={next} />;
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <GlobalLoadingPlaceholder minHeight="min-h-[120px]" />
        </div>
      }
    >
      <RegisterWithNext />
    </Suspense>
  );
}
