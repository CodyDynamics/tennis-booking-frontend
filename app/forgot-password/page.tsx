import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

const FORGOT_BG_IMAGE =
  "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=1600&q=80";

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${FORGOT_BG_IMAGE})` }}
      />
      <div className="absolute inset-0 bg-slate-900/70" />
      <div className="relative z-10 w-full max-w-md">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
