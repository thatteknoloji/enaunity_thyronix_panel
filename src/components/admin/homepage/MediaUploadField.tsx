"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import toast from "react-hot-toast";

export function MediaUploadField({
  label,
  value,
  onChange,
  accept = "image/*",
  kind = "banner",
  maxBytes,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  kind?: "banner" | "hero";
  maxBytes?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isVideo = accept.includes("video");

  const upload = async (file: File) => {
    if (maxBytes && file.size > maxBytes) {
      toast.error(`Dosya çok büyük (max ${Math.round(maxBytes / 1024)} KB)`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const r = await fetch("/api/admin/homepage/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!d.success) {
        toast.error(d.error || "Yüklenemedi");
        return;
      }
      onChange(d.data.url);
      toast.success("Yüklendi");
    } catch {
      toast.error("Yükleme hatası");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">{label}</label>
      <div className="flex gap-2 items-start">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL veya yükle"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="shrink-0 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"
        >
          <Upload size={14} /> {uploading ? "..." : "Yükle"}
        </button>
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }} />
      </div>
      {value && (
        <div className="mt-2 rounded-lg border overflow-hidden h-20 bg-gray-50">
          {isVideo ? (
            <video src={value} className="h-full w-full object-cover" muted playsInline />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={value} alt="" className="h-full w-full object-cover" />
          )}
        </div>
      )}
    </div>
  );
}
