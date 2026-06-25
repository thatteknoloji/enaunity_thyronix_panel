"use client";

import { usePodCore } from "./pod-core-context";

export function PodPrintAreaPanel() {
  const { engine, tick, refresh } = usePodCore();
  const bundle = engine?.getPrintAreaBundle();
  const vis = engine?.getOverlayVisibility();

  const toggle = (key: keyof NonNullable<typeof vis>) => {
    if (!engine || !vis) return;
    engine.setOverlayVisibility({ [key]: !vis[key] });
    refresh();
  };

  if (!bundle) {
    return <p className="text-xs text-ena-light/50">Mockup template seçin</p>;
  }

  return (
    <div className="space-y-3 text-xs" key={tick}>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Printable" value={`${Math.round(bundle.printable.width)}×${Math.round(bundle.printable.height)}`} color="text-emerald-600" />
        <Metric label="Safe" value={`${Math.round(bundle.safe.width)}×${Math.round(bundle.safe.height)}`} color="text-blue-500" />
        <Metric label="Bleed" value={`${Math.round(bundle.bleed.width)}×${Math.round(bundle.bleed.height)}`} color="text-red-500" />
        <Metric label="DPI" value={String(bundle.dpi)} color="text-ena-light" />
      </div>

      <div className="space-y-1.5">
        <ToggleRow label="Printable (yeşil)" checked={vis?.printable ?? true} onChange={() => toggle("printable")} />
        <ToggleRow label="Safe (mavi)" checked={vis?.safe ?? true} onChange={() => toggle("safe")} />
        <ToggleRow label="Bleed (kırmızı)" checked={vis?.bleed ?? true} onChange={() => toggle("bleed")} />
        <ToggleRow label="Grid" checked={vis?.grid ?? false} onChange={() => toggle("grid")} />
        <ToggleRow
          label="Clip to printable"
          checked={engine?.isClipEnabled() ?? false}
          onChange={() => {
            engine?.setClipEnabled(!engine.isClipEnabled());
            refresh();
          }}
        />
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-ena-border px-2 py-1.5">
      <p className="text-[10px] text-ena-light/50">{label}</p>
      <p className={`font-mono font-medium ${color}`}>{value}</p>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer">
      <span className="text-ena-light/80">{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-emerald-500" />
    </label>
  );
}
