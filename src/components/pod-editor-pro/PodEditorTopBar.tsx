"use client";

import Link from "next/link";
import {
  Download,
  Eye,
  Loader2,
  Minus,
  Plus,
  Redo2,
  Save,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { usePodCore } from "@/components/pod-core/pod-core-context";
import { usePodEditorActions } from "./usePodEditorActions";
import type { RightPanelTab } from "./PodEditorRightPanel";

type Props = {
  onTabChange: (tab: RightPanelTab) => void;
};

export function PodEditorTopBar({ onTabChange }: Props) {
  const {
    engine,
    refresh,
    mockupTemplate,
    projectName,
    setProjectName,
    lastSavedAt,
    pricing,
    pricingLoading,
  } = usePodCore();
  const { saveProject, runExport, busy } = usePodEditorActions();

  const canUndo = engine?.history.canUndo ?? false;
  const canRedo = engine?.history.canRedo ?? false;
  const zoom = engine?.getViewport().zoom ?? 1;

  const formatTry = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

  return (
    <header className="h-12 shrink-0 border-b border-white/5 bg-[#0f1117] flex items-center gap-2 px-3">
      <Link
        href={toAdminUrl("/admin/pod")}
        className="text-[11px] text-white/40 hover:text-white/70 hidden sm:inline"
      >
        ← Geri
      </Link>

      <div className="h-5 w-px bg-white/10 hidden sm:block" />

      <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        className="bg-transparent border-none text-sm font-semibold text-white/90 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 rounded px-1 max-w-[140px] sm:max-w-[200px]"
        title="Proje adı"
      />

      <span className="text-[10px] text-white/30 hidden md:inline truncate max-w-[120px]">
        {mockupTemplate.name}
      </span>

      {lastSavedAt && (
        <span className="text-[10px] text-white/25 hidden lg:inline">
          Kayıt: {new Date(lastSavedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}

      <div className="flex-1" />

      {pricing && !pricingLoading && (
        <span className="text-xs font-semibold text-emerald-400 hidden sm:inline tabular-nums">
          {formatTry(pricing.finalPrice)}
        </span>
      )}

      <div className="flex items-center gap-0.5 border border-white/10 rounded-lg p-0.5">
        <IconBtn disabled={!canUndo} onClick={() => void engine?.undo()} title="Geri al">
          <Undo2 className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn disabled={!canRedo} onClick={() => void engine?.redo()} title="Yinele">
          <Redo2 className="h-3.5 w-3.5" />
        </IconBtn>
      </div>

      <div className="flex items-center gap-0.5 border border-white/10 rounded-lg p-0.5">
        <IconBtn onClick={() => { engine?.zoomOut(); refresh(); }} title="Uzaklaştır">
          <ZoomOut className="h-3.5 w-3.5" />
        </IconBtn>
        <span className="text-[10px] text-white/50 w-10 text-center tabular-nums">
          {(zoom * 100).toFixed(0)}%
        </span>
        <IconBtn onClick={() => { engine?.zoomIn(); refresh(); }} title="Yakınlaştır">
          <ZoomIn className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn onClick={() => { engine?.resetView(); refresh(); }} title="Sıfırla">
          <Minus className="h-3.5 w-3.5" />
        </IconBtn>
      </div>

      <Btn
        onClick={() => void saveProject()}
        disabled={busy === "save"}
        icon={busy === "save" ? Loader2 : Save}
        spin={busy === "save"}
      >
        Kaydet
      </Btn>
      <Btn onClick={() => onTabChange("mockup")} icon={Eye}>
        Önizle
      </Btn>
      <Btn
        onClick={() => void runExport("production")}
        disabled={busy === "production"}
        icon={busy === "production" ? Loader2 : Download}
        spin={busy === "production"}
        primary
      >
        Production
      </Btn>
      <Btn onClick={() => onTabChange("export")} icon={Plus}>
        Export
      </Btn>
    </header>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="p-1.5 rounded text-white/50 hover:text-white/90 hover:bg-white/5 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  icon: Icon,
  spin,
  primary,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon: typeof Save;
  spin?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${
        primary
          ? "bg-emerald-600 text-white hover:bg-emerald-500"
          : "border border-white/10 text-white/80 hover:bg-white/5"
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${spin ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}
