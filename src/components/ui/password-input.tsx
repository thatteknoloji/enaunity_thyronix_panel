"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, id, disabled, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-ena-light">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            ref={ref}
            type={visible ? "text" : "password"}
            disabled={disabled}
            className={cn(
              "block w-full rounded border border-ena-border bg-ena-card/50 px-3 py-2.5 pr-10 text-sm text-ena-text shadow-sm placeholder:text-ena-text-muted/50 focus:border-ena-text/40 focus:outline-none focus:ring-1 focus:ring-ena-border",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500",
              disabled && "opacity-60 cursor-not-allowed",
              className
            )}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ena-light transition-colors hover:text-ena-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ena-primary/40 disabled:pointer-events-none"
            aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        </div>
        {error && <p className="text-sm text-ena-primary">{error}</p>}
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
