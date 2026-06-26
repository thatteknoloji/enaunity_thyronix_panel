"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  Circle,
  History,
  ImagePlus,
  Layers,
  LayoutTemplate,
  Package,
  Shapes,
  Sparkles,
  Square,
  Sticker,
  Type,
} from "lucide-react";
import { POD_CLIPART_LIBRARY } from "@/lib/pod-core/clipart-library";
import { buildPodProfileCards } from "@/lib/pod-core/pod-ui-bridge";
import { getMockupTemplate } from "@/lib/pod-core/mockup-template-registry";
import { PodHistoryPanel } from "@/components/pod-core/PodHistoryPanel";
import { PodLayerPanel } from "@/components/pod-core/PodLayerPanel";
import { PodVariantSelector } from "@/components/pod-core/PodVariantSelector";
import { usePodCore } from "@/components/pod-core/pod-core-context";
import type { PodUiRole } from "@/lib/pod-core/pod-ui-bridge";

type SectionId = "products" | "layers" | "images" | "texts" | "shapes" | "clipart" | "templates" | "history";

const SECTIONS: { id: SectionId; label: string; icon: typeof Package }[] = [
  { id: "products", label: "Ürünler", icon: Package },
  { id: "layers", label: "Katmanlar", icon: Layers },
  { id: "images", label: "Görseller", icon: ImagePlus },
  { id: "texts", label: "Yazılar", icon: Type },
  { id: "shapes", label: "Şekiller", icon: Shapes },
  { id: "clipart", label: "Clipart", icon: Sticker },
  { id: "templates", label: "Şablonlar", icon: LayoutTemplate },
  { id: "history", label: "Geçmiş", icon: History },
];

type Props = {
  role: PodUiRole;
};

export function PodEditorLeftPanel({ role }: Props) {
  const [open, setOpen] = useState<SectionId>("products");
  const inputRef = useRef<HTMLInputElement>(null);
  const { engine, refresh, setMockupTemplate } = usePodCore();
  const profiles = buildPodProfileCards(role);

  const toggle = (id: SectionId) => setOpen((prev) => (prev === id ? prev : id));

  const onFile = async (file: File | undefined) => {
    if (!file || !engine) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return;
    await engine.addImageFromFile(file);
    refresh();
  };

  return (
    <aside className="w-[min(260px,28vw)] shrink-0 border-r border-white/5 bg-[#12141a] flex flex-col min-h-0 pod-editor-pro-panel">
      <div className="flex-1 overflow-y-auto">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <div key={id} className="border-b border-white/5">
            <button
              type="button"
              onClick={() => toggle(id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                open === id ? "text-emerald-400 bg-white/[0.04]" : "text-white/50 hover:text-white/80"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open === id ? "rotate-180" : ""}`} />
            </button>
            {open === id && (
              <div className="px-3 pb-3 space-y-2">
                {id === "products" && <PodVariantSelector />}
                {id === "layers" && <PodLayerPanel />}
                {id === "images" && (
                  <>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => void onFile(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="w-full rounded-lg border border-dashed border-white/15 py-3 text-xs text-white/70 hover:border-emerald-500/40 hover:text-emerald-300"
                    >
                      Görsel yükle (PNG/JPG/WebP)
                    </button>
                    <p className="text-[10px] text-white/35">Sürükle-bırak veya tıkla. 20MP&apos;ye kadar desteklenir.</p>
                  </>
                )}
                {id === "texts" && (
                  <button
                    type="button"
                    onClick={() => {
                      engine?.addText();
                      refresh();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 py-2 text-xs text-emerald-300 hover:bg-emerald-600/30"
                  >
                    <Type className="h-3.5 w-3.5" /> Metin kutusu ekle
                  </button>
                )}
                {id === "shapes" && (
                  <div className="grid grid-cols-2 gap-2">
                    <ShapeBtn
                      icon={Square}
                      label="Dikdörtgen"
                      onClick={() => {
                        engine?.addRect();
                        refresh();
                      }}
                    />
                    <ShapeBtn
                      icon={Circle}
                      label="Daire"
                      onClick={() => {
                        engine?.addCircle();
                        refresh();
                      }}
                    />
                  </div>
                )}
                {id === "clipart" && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {POD_CLIPART_LIBRARY.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        title={item.name}
                        onClick={() => {
                          engine?.addClipartById(item.id);
                          refresh();
                        }}
                        className="rounded-md border border-white/10 bg-white/5 p-2 text-[9px] text-white/60 hover:border-emerald-500/40 hover:text-emerald-300"
                      >
                        <Sparkles className="h-4 w-4 mx-auto mb-1" style={{ color: item.fill }} />
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
                {id === "templates" && (
                  <ul className="max-h-48 overflow-y-auto space-y-1">
                    {profiles.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            const tpl = getMockupTemplate(p.templateId);
                            if (tpl) setMockupTemplate(tpl);
                          }}
                          className="w-full text-left rounded-md px-2 py-1.5 text-[11px] text-white/70 hover:bg-white/5 hover:text-emerald-300"
                        >
                          {p.name}
                          <span className="block text-[9px] text-white/30">{p.category}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {id === "history" && <PodHistoryPanel />}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

function ShapeBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Square;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-lg border border-white/10 py-2 text-[10px] text-white/60 hover:border-emerald-500/30 hover:text-emerald-300"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
