"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Package, Upload, FileText, Trash2 } from "lucide-react";
import { parseVariants, type DealerProductVariant } from "@/lib/dealer-products/types";

type Product = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  specPdfUrl: string;
  variantsJson: string;
  basePrice: number;
  active: boolean;
};

export default function DealerMyProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    specPdfUrl: "",
    basePrice: "0",
    variantLabel: "",
    variantPrice: "",
  });
  const [uploading, setUploading] = useState<"image" | "pdf" | null>(null);

  const load = useCallback(() => {
    fetch("/api/dealer/my-products")
      .then((r) => r.json())
      .then((d) => setProducts(d.data || []));
  }, []);

  useEffect(() => { load(); }, [load]);

  const uploadFile = async (file: File, kind: "image" | "pdf") => {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!d.success || !d.data?.[0]) throw new Error(d.error || "Yükleme başarısız");
      const url = d.data[0].fileUrl as string;
      if (kind === "image") setForm((f) => ({ ...f, imageUrl: url }));
      else setForm((f) => ({ ...f, specPdfUrl: url }));
      toast.success("Yüklendi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata");
    } finally {
      setUploading(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const variants: DealerProductVariant[] = [];
    if (form.variantLabel.trim()) {
      variants.push({
        label: form.variantLabel.trim(),
        price: parseFloat(form.variantPrice) || parseFloat(form.basePrice) || 0,
      });
    }
    const r = await fetch("/api/dealer/my-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        imageUrl: form.imageUrl,
        specPdfUrl: form.specPdfUrl,
        basePrice: parseFloat(form.basePrice) || 0,
        variants,
      }),
    });
    const d = await r.json();
    if (d.success) {
      toast.success("Ürün eklendi");
      setShowForm(false);
      setForm({ name: "", description: "", imageUrl: "", specPdfUrl: "", basePrice: "0", variantLabel: "", variantPrice: "" });
      load();
    } else toast.error(d.error || "Hata");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dealer" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="text-lg font-bold">Bayi Ürünlerim</h1>
            <p className="text-xs text-gray-500">Foto + PDF + ebat — katalog eşleştirme yok</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm"
        >
          <Plus size={16} /> Ürün Ekle
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {products.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-xl bg-white text-gray-500 text-sm">
            Henüz ürün yok. Fotoğraf ve PDF yükleyerek ilk ürününüzü ekleyin.
          </div>
        ) : (
          products.map((p) => {
            const variants = parseVariants(p.variantsJson);
            return (
              <div key={p.id} className="bg-white rounded-xl border p-4 flex gap-4">
                <div className="h-20 w-20 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.description || "—"}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {variants.map((v) => (
                      <span key={v.label} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">{v.label}</span>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-2 text-xs">
                    <a href={p.specPdfUrl} target="_blank" rel="noreferrer" className="text-ena-primary hover:underline inline-flex items-center gap-1">
                      <FileText size={12} /> PDF
                    </a>
                    <Link href={`/dealer/manual-order?product=${p.id}`} className="text-emerald-600 hover:underline">
                      Sipariş ver →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <form onSubmit={submit} className="bg-white rounded-xl max-w-md w-full p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg">Yeni Bayi Ürünü</h3>
            <input required placeholder="Ürün adı" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm" />
            <textarea placeholder="Açıklama (opsiyonel)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm" rows={2} />
            <input placeholder="Taban fiyat (₺)" type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm" />
            <input placeholder="Ebat / varyant (ör. 120x80 cm)" value={form.variantLabel} onChange={(e) => setForm({ ...form, variantLabel: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <label className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 border rounded-lg text-xs cursor-pointer hover:bg-gray-50">
                <Upload size={14} /> {uploading === "image" ? "…" : "Foto *"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "image"); }} />
              </label>
              <label className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 border rounded-lg text-xs cursor-pointer hover:bg-gray-50">
                <FileText size={14} /> {uploading === "pdf" ? "…" : "PDF *"}
                <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "pdf"); }} />
              </label>
            </div>
            {!form.imageUrl || !form.specPdfUrl ? (
              <p className="text-xs text-amber-600">Fotoğraf ve PDF zorunlu</p>
            ) : (
              <p className="text-xs text-emerald-600">Dosyalar hazır ✓</p>
            )}
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={!form.imageUrl || !form.specPdfUrl} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-40">Kaydet</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500">İptal</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
