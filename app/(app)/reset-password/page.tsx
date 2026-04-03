import { Suspense } from "react";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

const RESET_BG_IMAGE =
  "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=1600&q=80";

function ResetPasswordFallback() {
  return (
    <div className="relative z-10 w-full max-w-md rounded-xl border bg-card/95 p-8 text-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${RESET_BG_IMAGE})` }}
      />
      <div className="absolute inset-0 bg-slate-900/70" />
      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={<ResetPasswordFallback />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
