"use client";

import { useRef, useState } from "react";
import { Upload, X, Star, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  image: string;
  imagesJson: string;
  onChange: (image: string, imagesJson: string) => void;
}

function parseImages(json: string): string[] {
  try {
    const parsed = JSON.parse(json || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function ProductImagesField({ image, imagesJson, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const gallery = (() => {
    const fromJson = parseImages(imagesJson);
    if (fromJson.length) return fromJson;
    return image ? [image] : [];
  })();

  const sync = (next: string[]) => {
    const main = next[0] || "";
    onChange(main, JSON.stringify(next));
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Yükleme başarısız");
        return;
      }
      const urls = (data.data || []).map((f: { fileUrl: string }) => f.fileUrl);
      sync([...gallery, ...urls]);
      toast.success(`${urls.length} fotoğraf yüklendi`);
    } catch {
      toast.error("Yükleme başarısız");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (index: number) => {
    sync(gallery.filter((_, i) => i !== index));
  };

  const setMain = (index: number) => {
    if (index === 0) return;
    const next = [...gallery];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    sync(next);
  };

  const ic =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
        <ImageIcon size={16} /> Ürün Fotoğrafları
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Dosya yükleyin veya URL girin. İlk fotoğraf vitrin görseli olur.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        {gallery.map((url, i) => (
          <div key={`${url}-${i}`} className="relative group">
            <img
              src={url}
              alt=""
              className="h-24 w-24 rounded-lg object-cover border border-gray-200 bg-gray-50"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
            {i === 0 && (
              <span className="absolute top-1 left-1 text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">
                Vitrin
              </span>
            )}
            <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => setMain(i)}
                  className="p-1 rounded bg-white/90 text-amber-700"
                  title="Vitrin yap"
                >
                  <Star size={12} />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="p-1 rounded bg-white/90 text-red-600"
                title="Kaldır"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Upload size={20} />
          <span className="text-[10px] mt-1 font-medium">
            {uploading ? "..." : "Yükle"}
          </span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => uploadFiles(e.target.files)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Vitrin Görsel URL
          </label>
          <input
            className={ic}
            value={image}
            onChange={(e) => onChange(e.target.value, imagesJson)}
            placeholder="/uploads/... veya https://..."
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Ek URL ekle
          </label>
          <div className="flex gap-2">
            <input
              id="product-extra-image-url"
              className={ic}
              placeholder="https://..."
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const input = e.currentTarget;
                const url = input.value.trim();
                if (!url) return;
                sync([...gallery, url]);
                input.value = "";
              }}
            />
            <button
              type="button"
              className="shrink-0 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50"
              onClick={() => {
                const input = document.getElementById(
                  "product-extra-image-url"
                ) as HTMLInputElement | null;
                const url = input?.value.trim();
                if (!url) return;
                sync([...gallery, url]);
                if (input) input.value = "";
              }}
            >
              Ekle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
