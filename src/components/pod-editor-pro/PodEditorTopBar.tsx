"use client";

import Link from "next/link";
import {
  Download,
  Eye,
  Grid3X3,
  Loader2,
  Magnet,
  Maximize2,
  Redo2,
  Ruler,
  Save,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { podBasePath, type PodUiRole } from "@/lib/pod-core/pod-ui-bridge";
import { usePodCore } from "@/components/pod-core/pod-core-context";
import { usePodEditorActions } from "./usePodEditorActions";
import type { RightPanelTab } from "./PodEditorRightPanel";

type Props = {
  role: PodUiRole;
  onTabChange: (tab: RightPanelTab) => void;
};

export function PodEditorTopBar({ role, onTabChange }: Props) {
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
  const vis = engine?.getOverlayVisibility();
  const gridOn = vis?.grid ?? false;
  const rulerOn = vis?.ruler ?? true;
  const snapOn = engine?.isSnapEnabled() ?? true;

  const backHref = role === "admin" ? toAdminUrl("/admin/pod") : `${podBasePath(role)}/designs`;

  const formatTry = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

  const fitCanvas = () => {
    const el = document.querySelector(".pod-canvas-viewport");
    if (el && engine) {
      engine.fitToScreen(el.clientWidth, el.clientHeight);
      refresh();
    }
  };

  return (
    <header className="h-11 shrink-0 border-b border-white/5 bg-[#0f1117] flex items-center gap-1.5 px-2 sm:px-3">
      <Link href={backHref} className="text-[11px] text-white/40 hover:text-white/70 hidden sm:inline shrink-0">
        ← Geri
      </Link>
      <div className="h-5 w-px bg-white/10 hidden sm:block" />
      <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        className="bg-transparent border-none text-sm font-semibold text-white/90 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 rounded px-1 max-w-[100px] sm:max-w-[180px] shrink-0"
        title="Proje adı"
      />
      <span className="text-[10px] text-white/30 hidden lg:inline truncate max-w-[100px]">{mockupTemplate.name}</span>
      {lastSavedAt && (
        <span className="text-[10px] text-white/25 hidden xl:inline">
          {new Date(lastSavedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
      <div className="flex-1 min-w-2" />
      {pricing && !pricingLoading && (
        <span className="text-xs font-semibold text-emerald-400 hidden md:inline tabular-nums shrink-0">
          {formatTry(pricing.finalPrice)}
        </span>
      )}
      <ToolbarGroup>
        <IconBtn disabled={!canUndo} onClick={() => void engine?.undo()} title="Geri al (Ctrl+Z)">
          <Undo2 className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn disabled={!canRedo} onClick={() => void engine?.redo()} title="Yinele">
          <Redo2 className="h-3.5 w-3.5" />
        </IconBtn>
      </ToolbarGroup>
      <ToolbarGroup>
        <IconBtn onClick={() => { engine?.zoomOut(); refresh(); }} title="Uzaklaştır">
          <ZoomOut className="h-3.5 w-3.5" />
        </IconBtn>
        <span className="text-[10px] text-white/50 w-9 text-center tabular-nums">{(zoom * 100).toFixed(0)}%</span>
        <IconBtn onClick={() => { engine?.zoomIn(); refresh(); }} title="Yakınlaştır">
          <ZoomIn className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn onClick={fitCanvas} title="Sığdır (Fit)">
          <Maximize2 className="h-3.5 w-3.5" />
        </IconBtn>
      </ToolbarGroup>
      <ToolbarGroup>
        <IconBtn active={gridOn} onClick={() => { engine?.setOverlayVisibility({ grid: !gridOn }); refresh(); }} title="Grid">
          <Grid3X3 className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn
          active={snapOn}
          onClick={() => { engine?.setSnapEnabled(!snapOn); refresh(); }}
          title="Snap"
        >
          <Magnet className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn
          active={rulerOn}
          onClick={() => { engine?.setOverlayVisibility({ ruler: !rulerOn }); refresh(); }}
          title="Cetvel"
        >
          <Ruler className="h-3.5 w-3.5" />
        </IconBtn>
      </ToolbarGroup>
      <Btn onClick={() => void saveProject()} disabled={busy === "save"} icon={busy === "save" ? Loader2 : Save} spin={busy === "save"}>
        Kaydet
      </Btn>
      <Btn onClick={() => onTabChange("mockup")} icon={Eye}>
        Önizle
      </Btn>
      <Btn onClick={() => void runExport("production")} disabled={busy === "production"} icon={busy === "production" ? Loader2 : Download} spin={busy === "production"} primary>
        Production
      </Btn>
      <Btn onClick={() => onTabChange("export")} icon={Download}>
        Export
      </Btn>
    </header>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5 border border-white/10 rounded-lg p-0.5 shrink-0">{children}</div>;
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors disabled:opacity-30 ${
        active ? "bg-emerald-500/20 text-emerald-400" : "text-white/50 hover:text-white/90 hover:bg-white/5"
      }`}
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
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors disabled:opacity-50 shrink-0 ${
        primary ? "bg-emerald-600 text-white hover:bg-emerald-500" : "border border-white/10 text-white/80 hover:bg-white/5"
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${spin ? "animate-spin" : ""}`} />
      <span className="hidden lg:inline">{children}</span>
    </button>
  );
}
