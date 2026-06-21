"use client";

import Link from "next/link";
import {
  BarChart3,
  Clock,
  Headphones,
  Package,
  RefreshCw,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { TrustBadge } from "@/lib/products/presentation";

const ICON_MAP: Record<string, LucideIcon> = {
  Truck,
  RefreshCw,
  ShieldCheck,
  Headphones,
  Package,
  Clock,
  BarChart3,
};

export function ProductTrustBadges({
  badges,
  className = "",
}: {
  badges: TrustBadge[];
  className?: string;
}) {
  if (!badges.length) return null;

  return (
    <div className={`grid grid-cols-2 gap-2 text-ena-light ${className}`}>
      {badges.map((badge, i) => {
        const Icon = ICON_MAP[badge.icon] || Package;
        return (
          <div key={`${badge.icon}-${i}`} className="flex items-center gap-2 text-sm">
            <Icon size={14} className="shrink-0" />
            <span>{badge.text}</span>
          </div>
        );
      })}
    </div>
  );
}

export const TRUST_BADGE_ICON_OPTIONS = Object.keys(ICON_MAP);
