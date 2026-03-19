"use client";

import { useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PasswordInputProps {
  id: string;
  placeholder?: string;
  className?: string;
  error?: string;
  /** From react-hook-form: register("password") or register("confirmPassword") */
  register: UseFormRegisterReturn;
  /** Optional: extra class for the input */
  inputClassName?: string;
  /** Show Lock icon on the left (default true) */
  showLockIcon?: boolean;
}

export function PasswordInput({
  id,
  placeholder = "••••••••",
  className,
  error,
  register,
  inputClassName,
  showLockIcon = true,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        {showLockIcon && (
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          className={cn(
            showLockIcon ? "pl-10" : "pl-3",
            "pr-11",
            inputClassName,
          )}
          {...register}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setShowPassword((p) => !p)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
