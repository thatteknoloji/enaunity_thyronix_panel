"use client";

import { useCallback, useEffect, useState } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";

type Design = {
  id: string;
  title: string;
  thumbnailUrl: string;
  fileUrl: string;
  previewUrl: string;
  fileType: string;
  width: number;
  height: number;
  transparentBackground: boolean;
  createdAt: string;
};

export function PodDesignLibrary({ onSelect }: { onSelect?: (d: Design) => void }) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/pod/designs?limit=50");
      const d = await r.json();
      if (d.success) setDesigns(d.data.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title || file.name.replace(/\.[^.]+$/, ""));
      const r = await fetch("/api/pod/designs/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Yükleme başarısız");
      setTitle("");
      await load();
      onSelect?.(d.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yükleme başarısız");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      )}

      <div className="rounded-xl border border-ena-border bg-ena-card/40 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Upload size={16} className="text-emerald-400" /> Tasarım Yükle (PNG / SVG, max 50MB)
        </h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tasarım adı (opsiyonel)"
          className="w-full rounded-lg border border-ena-border bg-ena-bg/50 px-3 py-2 text-sm text-white"
        />
        <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 px-4 py-8 cursor-pointer hover:bg-emerald-500/10 transition-colors">
          {uploading ? <Loader2 className="animate-spin text-emerald-400" size={20} /> : <ImagePlus className="text-emerald-400" size={20} />}
          <span className="text-sm text-ena-light">{uploading ? "Yükleniyor…" : "PNG veya SVG seç"}</span>
          <input
            type="file"
            accept="image/png,image/svg+xml,.png,.svg"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-emerald-400" size={24} /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect?.(d)}
              className="rounded-xl border border-ena-border bg-ena-card/40 p-3 text-left hover:border-emerald-500/40 transition-colors"
            >
              <div className="aspect-square rounded-lg bg-black/30 mb-2 overflow-hidden flex items-center justify-center">
                {d.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.thumbnailUrl} alt={d.title} className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-ena-light/50">{d.fileType}</span>
                )}
              </div>
              <p className="text-sm font-medium text-white truncate">{d.title}</p>
              <p className="text-[10px] text-ena-light/50 mt-0.5">
                {d.fileType} · {d.width}×{d.height}
                {d.transparentBackground ? " · şeffaf" : ""}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
