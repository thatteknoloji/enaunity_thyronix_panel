"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Check, AlertTriangle, ImageIcon, BarChart3 } from "lucide-react";
import toast from "react-hot-toast";

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
  barcode: string;
  status: "pending" | "uploading" | "done" | "error";
  result?: string;
}

function extractBarcode(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  if (/^\d{8,14}$/.test(base)) return base;
  return base.replace(/[^a-zA-Z0-9_-]/g, "");
}

export default function ThyronixPhotosPage() {
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newPhotos: PendingPhoto[] = Array.from(files)
      .filter(f => /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name))
      .map(f => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        preview: URL.createObjectURL(f),
        barcode: extractBarcode(f.name),
        status: "pending" as const,
      }));
    setPhotos(prev => [...prev, ...newPhotos]);
  }, []);

  const updateBarcode = (id: string, barcode: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, barcode } : p));
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const p = prev.find(p => p.id === id);
      if (p) URL.revokeObjectURL(p.preview);
      return prev.filter(p => p.id !== id);
    });
  };

  const clearAll = () => {
    photos.forEach(p => URL.revokeObjectURL(p.preview));
    setPhotos([]);
  };

  const uploadAll = async () => {
    const pending = photos.filter(p => p.status === "pending" || p.status === "error");
    if (!pending.length) return toast.error("Yüklenecek fotoğraf yok");
    setUploading(true);

    let success = 0;
    let failed = 0;

    for (const p of pending) {
      setPhotos(prev => prev.map(ph => ph.id === p.id ? { ...ph, status: "uploading" } : ph));
      try {
        const fd = new FormData();
        fd.append("file", p.file, p.file.name);
        fd.append("barcode", p.barcode);
        const res = await fetch("/api/thyronix/photos/upload", { method: "POST", body: fd });
        const d = await res.json();
        if (d.success) {
          success++;
          setPhotos(prev => prev.map(ph => ph.id === p.id ? { ...ph, status: "done", result: `${d.data.matched} ürün eşleşti` } : ph));
        } else {
          failed++;
          setPhotos(prev => prev.map(ph => ph.id === p.id ? { ...ph, status: "error", result: d.error } : ph));
        }
      } catch (e: any) {
        failed++;
        setPhotos(prev => prev.map(ph => ph.id === p.id ? { ...ph, status: "error", result: e.message } : ph));
      }
    }

    setUploading(false);
    toast.success(`${success} başarılı, ${failed} hatalı`);
  };

  const stats = {
    total: photos.length,
    done: photos.filter(p => p.status === "done").length,
    pending: photos.filter(p => p.status === "pending").length,
    error: photos.filter(p => p.status === "error").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexa-text">Fotoğraflar</h1>
          <p className="text-sm text-nexa-text-secondary mt-1">Barkod isimli fotoğrafları sürükle-bırak ile yükle</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-nexa-card border border-nexa-border text-nexa-text rounded-lg text-sm hover:bg-nexa-hover transition-colors">
            <Upload size={14} /> Dosya Seç
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
            onChange={e => e.target.files && addFiles(e.target.files)} />
          {photos.length > 0 && (
            <button onClick={clearAll} className="flex items-center gap-2 px-4 py-2 border border-nexa-danger/30 text-nexa-danger/80 rounded-lg text-sm hover:bg-nexa-danger/10 transition-colors">
              <X size={14} /> Temizle
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {photos.length > 0 && (
        <div className="flex gap-4">
          <div className="rounded-xl border border-nexa-border bg-nexa-card px-4 py-3 flex items-center gap-3">
            <ImageIcon size={20} className="text-nexa-primary" />
            <div><p className="text-lg font-bold text-nexa-text">{stats.total}</p><p className="text-[10px] text-nexa-text-secondary">Toplam</p></div>
          </div>
          <div className="rounded-xl border border-nexa-border bg-nexa-card px-4 py-3 flex items-center gap-3">
            <Check size={20} className="text-nexa-success" />
            <div><p className="text-lg font-bold text-nexa-text">{stats.done}</p><p className="text-[10px] text-nexa-text-secondary">Yüklendi</p></div>
          </div>
          <div className="rounded-xl border border-nexa-border bg-nexa-card px-4 py-3 flex items-center gap-3">
            <AlertTriangle size={20} className="text-nexa-warning" />
            <div><p className="text-lg font-bold text-nexa-text">{stats.pending}</p><p className="text-[10px] text-nexa-text-secondary">Bekliyor</p></div>
          </div>
          {stats.error > 0 && (
            <div className="rounded-xl border border-nexa-danger/30 bg-nexa-card px-4 py-3 flex items-center gap-3">
              <X size={20} className="text-nexa-danger" />
              <div><p className="text-lg font-bold text-nexa-text">{stats.error}</p><p className="text-[10px] text-nexa-text-secondary">Hata</p></div>
            </div>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); e.dataTransfer.files && addFiles(e.dataTransfer.files); }}
        className={`rounded-2xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer
          ${dragOver ? "border-nexa-primary bg-nexa-primary/5" : "border-nexa-border bg-nexa-card/50 hover:border-nexa-text-secondary/30"}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <Camera size={48} className="mx-auto text-nexa-text-secondary/30 mb-4" />
        <p className="text-nexa-text-secondary font-medium">Fotoğrafları buraya sürükleyin</p>
        <p className="text-xs text-nexa-text-secondary/50 mt-1">veya tıklayarak seçin</p>
        <p className="text-[10px] text-nexa-text-secondary/40 mt-3">
          Dosya adı barkod olarak kullanılır (örn: 8691234567890.jpg)
        </p>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map(p => (
              <div key={p.id} className={`rounded-xl border overflow-hidden transition-all ${
                p.status === "done" ? "border-nexa-success/30" :
                p.status === "error" ? "border-nexa-danger/30" :
                "border-nexa-border"
              } bg-nexa-card group`}>
                <div className="aspect-square relative overflow-hidden bg-nexa-bg">
                  <img src={p.preview} alt={p.barcode} className="w-full h-full object-cover" />
                  {p.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
                    </div>
                  )}
                  {p.status === "done" && (
                    <div className="absolute top-2 right-2 bg-nexa-success text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Check size={10} /> Tamam
                    </div>
                  )}
                  {p.status === "error" && (
                    <div className="absolute top-2 right-2 bg-nexa-danger text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <X size={10} /> Hata
                    </div>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); removePhoto(p.id); }}
                    className="absolute top-2 left-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} className="text-white" />
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  <input
                    value={p.barcode}
                    onChange={e => updateBarcode(p.id, e.target.value)}
                    className="w-full text-xs bg-nexa-bg border border-nexa-border rounded px-2 py-1.5 text-nexa-text font-mono focus:outline-none focus:border-nexa-primary/50"
                    placeholder="Barkod"
                    disabled={p.status === "done" || p.status === "uploading"}
                  />
                  <p className="text-[10px] text-nexa-text-secondary/60 truncate">{p.file.name}</p>
                  {p.result && (
                    <p className={`text-[10px] ${p.status === "done" ? "text-nexa-success" : "text-nexa-danger"}`}>{p.result}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Upload all button */}
          {stats.pending > 0 && (
            <div className="flex justify-center">
              <button onClick={uploadAll} disabled={uploading}
                className="flex items-center gap-2 px-8 py-3 bg-nexa-primary text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50">
                {uploading ? (
                  <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Yükleniyor...</>
                ) : (
                  <><Upload size={16} /> {stats.pending} Fotoğrafı Yükle</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
