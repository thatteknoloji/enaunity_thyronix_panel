"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
  children: ReactNode;
  icon?: LucideIcon;
  maxWidth?: "md" | "lg" | "xl" | "4xl";
};

const MAX_W = {
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
  "4xl": "max-w-5xl",
};

export function DealerSubPage({
  title,
  description,
  backHref = "/dealer",
  actions,
  children,
  icon: Icon,
  maxWidth = "xl",
}: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href={backHref}
            className="mt-1 rounded-lg p-1.5 text-ena-light/60 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            aria-label="Geri"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {Icon && <Icon size={22} className="text-ena-primary shrink-0" />}
              {title}
            </h1>
            {description && <p className="text-sm text-ena-light mt-1">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className={MAX_W[maxWidth]}>{children}</div>
    </div>
  );
}

export function DealerPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-ena-card/40 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

export function DealerField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-xs font-medium text-ena-light ${className}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const dealerInputClass =
  "w-full rounded-lg border border-white/10 bg-ena-dark/60 px-3 py-2 text-sm text-white placeholder:text-ena-light/40 focus:border-ena-primary/50 focus:outline-none";

export const dealerSelectClass = dealerInputClass;
