"use client";

import { useEffect, useState, useRef } from "react";
import {
  Image, Trash2, Upload, AlertCircle, CheckCircle, Loader2, X
} from "lucide-react";

type StoreMedia = {
  id: string;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  createdAt: string;
};

export default function MediaTab() {
  const [media, setMedia] = useState<StoreMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async () => {
    try {
      const res = await fetch("/api/dealer/dropship/media");
      const d = await res.json();
      if (d.success) setMedia(d.data);
    } catch {
      setError("Medya yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedia(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true); setError(""); setSuccess("");
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch("/api/dealer/dropship/media", { method: "POST", body: fd });
      const d = await res.json();
      if (d.success) {
        setMedia((prev) => [...d.data, ...prev]);
        setSuccess(`${d.data.length} dosya yüklendi`);
      } else {
        setError(d.error || "Yükleme başarısız");
      }
    } catch {
      setError("Yükleme başarısız");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeMedia = async (id: string) => {
    try {
      const res = await fetch("/api/dealer/dropship/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (d.success) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
        setSuccess("Dosya silindi");
      }
    } catch {
      setError("Silinemedi");
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(window.location.origin + url);
    setSuccess("URL kopyalandı!");
  };

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 text-center">
        <Loader2 size={24} className="animate-spin mx-auto text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Medya Kütüphanesi</h2>
          <div>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 text-sm">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? "Yükleniyor..." : "Görsel Yükle"}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {media.length === 0 ? (
          <div className="text-center py-8">
            <Image size={40} className="mx-auto text-gray-500 mb-3" />
            <p className="text-sm text-ena-light">Henüz görsel yüklemedin. Mağazanda kullanmak için görsel yükle.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {media.map((m) => (
              <div key={m.id} className="group relative aspect-square rounded-xl overflow-hidden bg-ena-dark border border-white/10">
                <img
                  src={m.url}
                  alt={m.filename}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setPreviewUrl(m.url)}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => copyUrl(m.url)}
                    className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </button>
                  <button onClick={() => removeMedia(m.id)}
                    className="p-1.5 bg-red-500/60 hover:bg-red-500/80 rounded-lg transition-colors">
                    <Trash2 size={14} className="text-white" />
                  </button>
                </div>
                <p className="absolute bottom-0 left-0 right-0 text-[10px] text-white/70 bg-black/50 px-1.5 py-0.5 truncate">
                  {m.filename}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="" className="max-w-full max-h-[85vh] rounded-2xl" />
            <button onClick={() => setPreviewUrl(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
