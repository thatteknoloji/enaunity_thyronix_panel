"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function BulkImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; total: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/products/bulk", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || "Bir hata oluştu");
      }
    } catch {
      setError("Dosya yüklenemedi");
    }
    setUploading(false);
  };

  const downloadSample = () => {
    const headers = ["name", "description", "price", "stock", "category", "subcategory", "image"];
    const sample = ["Örnek Ürün", "Ürün açıklaması", "199.99", "50", "Cam Tablo", "Yatay", "https://picsum.photos/seed/ornek/600/800"];
    const csv = [headers.join(","), sample.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ornek-urun-listesi.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-xl">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6">
        <ArrowLeft size={14} /> Ürünlere Dön
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Toplu Ürün Ekle</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
          <div className="rounded-lg bg-blue-50 p-2.5">
            <FileSpreadsheet size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Excel / CSV ile Toplu Yükleme</h2>
            <p className="text-xs text-gray-500">.xlsx, .xls veya .csv dosyası yükleyin</p>
          </div>
          <button onClick={downloadSample} className="ml-auto text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
            <Download size={12} /> Örnek İndir
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-gray-300 transition-colors cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-600">
              {file ? file.name : "Dosya seçmek için tıklayın"}
            </p>
            <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv (max 10MB)</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="text-xs text-gray-500 space-y-1 bg-gray-50 rounded-lg p-3">
            <p className="font-medium text-gray-700">Desteklenen Sütunlar:</p>
            <code className="text-gray-600">name, description, price, stock, category, subcategory, image</code>
          </div>

          <Button type="submit" disabled={!file || uploading} className="w-full">
            {uploading ? "Yükleniyor..." : "Ürünleri İçe Aktar"}
          </Button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-ena-primary/5 p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-ena-primary shrink-0 mt-0.5" />
          <p className="text-sm text-ena-primary">{error}</p>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-3">İçe Aktarma Sonucu</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{result.created}</p>
              <p className="text-xs text-green-700">Eklenen</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">{result.skipped}</p>
              <p className="text-xs text-amber-700">Atlanan</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">{result.total}</p>
              <p className="text-xs text-gray-600">Toplam</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-ena-primary mb-1">Uyarılar:</p>
              <ul className="text-xs text-ena-primary space-y-0.5">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Link href="/admin/products">
              <Button size="sm">Ürünleri Görüntüle</Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => { setResult(null); setFile(null); }}>
              Yeni Yükleme
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
