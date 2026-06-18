"use client";

import { RefreshCw } from "lucide-react";
import { statusLabel } from "@/lib/ui/turkish-labels";

/** Isolates panel from body text-ena-text (white) inheritance */
export const PL_PANEL =
  "text-slate-900 [&_input]:bg-white [&_input]:text-slate-900 [&_input]:placeholder:text-slate-400 [&_select]:bg-white [&_select]:text-slate-900 [&_textarea]:bg-white [&_textarea]:text-slate-900";

export function PlBadge({ children, tone = "gray" }: { children: React.ReactNode; tone?: string }) {
  const colors: Record<string, string> = {
    gray: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[tone] || colors.gray}`}>
      {children}
    </span>
  );
}

export function PlStatusBadge({ status }: { status: string }) {
  const tone =
    status === "ACTIVE" || status === "COMPLETED" ? "green"
    : status === "FAILED" ? "red"
    : status === "PENDING" || status === "RUNNING" ? "amber"
    : "gray";
  return <PlBadge tone={tone}>{statusLabel(status)}</PlBadge>;
}

export function PlCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

export function PlStat({ label, value, icon: Icon }: { label: string; value: string | number; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <PlCard className="p-4">
      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
    </PlCard>
  );
}

export function PlInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ena-primary/30 focus:border-ena-primary ${props.className || ""}`}
    />
  );
}

export function PlSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-ena-primary/30 focus:border-ena-primary ${props.className || ""}`}
    />
  );
}

export function PlTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ena-primary/30 focus:border-ena-primary ${props.className || ""}`}
    />
  );
}

export function PlBtn({
  children,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "sm" | "md" }) {
  const sizes = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const variants = {
    primary: "bg-ena-primary text-white hover:opacity-90 disabled:opacity-50",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
    ghost: "text-slate-600 hover:bg-slate-100 disabled:opacity-50",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors ${sizes} ${variants[variant]} ${props.className || ""}`}
    />
  );
}

export function PlAlert({ type, children }: { type: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "bg-red-50 text-red-800 border-red-100",
    success: "bg-emerald-50 text-emerald-800 border-emerald-100",
    info: "bg-blue-50 text-blue-800 border-blue-100",
  };
  return <div className={`p-3 text-sm rounded-lg border ${styles[type]}`}>{children}</div>;
}

export function PlHeader({
  title,
  subtitle,
  onRefresh,
  loading,
}: {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {onRefresh && (
        <PlBtn variant="secondary" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Yenile
        </PlBtn>
      )}
    </div>
  );
}

export function PlTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; icon?: React.ComponentType<{ size?: number }> }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 mb-6 p-1 bg-slate-100 rounded-xl">
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active === t.id ? "bg-white text-ena-primary shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {Icon && <Icon size={15} />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function PlModal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${wide ? "max-w-3xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function PlTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

export function PlEmpty({ message }: { message: string }) {
  return <p className="text-sm text-slate-500 text-center py-8">{message}</p>;
}

export function fmtMoney(n: number) {
  return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function fmtDate(d: string | Date) {
  return new Date(d).toLocaleString("tr-TR");
}
