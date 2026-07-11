"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Box,
  Building2,
  Clock,
  Cloud,
  Cpu,
  Database,
  Eye,
  FileText,
  GitBranch,
  Globe,
  Link2,
  Layout,
  Network,
  Package,
  Plug,
  Rss,
  Share2,
  Shield,
  Sparkles,
  Store,
  Wallet,
  Workflow,
  Zap,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  Sparkles,
  Package,
  Globe,
  Link2,
  Cloud,
  Cpu,
  Store,
  Box,
  Building2,
  BarChart3,
  FileText,
  Wallet,
  Plug,
  Database,
  GitBranch,
  Workflow,
  Bot,
  Rss,
  Clock,
  Network,
  Share2,
  Layout,
  Shield,
  Eye,
};

export const SHOWCASE_ICON_OPTIONS = Object.keys(ICON_MAP);

export function ShowcaseIcon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[name] || Zap;
  return <Icon size={size} className={className} />;
}

export function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return { r: 59, g: 130, b: 246 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
