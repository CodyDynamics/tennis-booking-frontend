"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

type AuthMode = "login" | "register";

export interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after successful login or registration (e.g. navigate, close). */
  onAuthenticated: () => void;
  /** Shown under the title to explain why auth is required. */
  description?: string;
}

/** Reuses LoginForm and RegisterForm in a modal (same as /login and /register pages). */
export function AuthDialog({
  open,
  onOpenChange,
  onAuthenticated,
  description = "Sign in or create an account to reserve a court at this location.",
}: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>("login");

  useEffect(() => {
    if (!open) setMode("login");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "login" ? "Sign in" : "Create account"}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="pt-1">
          {mode === "login" ? (
            <LoginForm
              onSwitchToRegister={() => setMode("register")}
              onLoginSuccess={onAuthenticated}
            />
          ) : (
            <RegisterForm
              onSwitchToLogin={() => setMode("login")}
              onRegisterSuccess={onAuthenticated}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
