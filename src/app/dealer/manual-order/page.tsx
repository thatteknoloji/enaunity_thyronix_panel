"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Upload, FileText, ShoppingCart } from "lucide-react";
import { parseVariants } from "@/lib/dealer-products/types";

function ManualOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("product");

  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({
    dealerProductId: preselect || "",
    variantLabel: "",
    quantity: "1",
    customerName: "",
    customerPhone: "",
    customerCity: "",
    customerAddress: "",
    productName: "",
    unitPrice: "",
    orderImageUrl: "",
    orderPdfUrl: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<"image" | "pdf" | null>(null);

  useEffect(() => {
    fetch("/api/dealer/my-products")
      .then((r) => r.json())
      .then((d) => {
        setProducts((d.data || []).filter((p: any) => p.active));
        if (preselect) setForm((f) => ({ ...f, dealerProductId: preselect }));
      });
  }, [preselect]);

  const selected = products.find((p) => p.id === form.dealerProductId);
  const variants = selected ? parseVariants(selected.variantsJson) : [];

  const uploadFile = async (file: File, kind: "image" | "pdf") => {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!d.success || !d.data?.[0]) throw new Error(d.error || "Yükleme başarısız");
      const url = d.data[0].fileUrl as string;
      if (kind === "image") setForm((f) => ({ ...f, orderImageUrl: url }));
      else setForm((f) => ({ ...f, orderPdfUrl: url }));
      toast.success("Yüklendi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata");
    } finally {
      setUploading(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orderImageUrl || !form.orderPdfUrl) {
      toast.error("Sipariş fotoğrafı ve PDF zorunlu");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/dealer/manual-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealerProductId: form.dealerProductId || undefined,
          variantLabel: form.variantLabel || undefined,
          productName: form.productName || undefined,
          quantity: parseInt(form.quantity, 10) || 1,
          unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerCity: form.customerCity,
          customerAddress: form.customerAddress,
          orderImageUrl: form.orderImageUrl,
          orderPdfUrl: form.orderPdfUrl,
          notes: form.notes,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Hata");
      toast.success("Manuel sipariş oluşturuldu");
      router.push("/dealer/marketplace/orders");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4 flex items-center gap-3">
        <Link href="/dealer/my-products" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></Link>
        <div>
          <h1 className="text-lg font-bold">Manuel Sipariş</h1>
          <p className="text-xs text-gray-500">Foto + PDF zorunlu — operasyon paneline düşer</p>
        </div>
      </div>

      <form onSubmit={submit} className="max-w-lg mx-auto p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600">Bayi ürünü (opsiyonel)</label>
          <select
            value={form.dealerProductId}
            onChange={(e) => setForm({ ...form, dealerProductId: e.target.value, variantLabel: "" })}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Serbest / yeni ürün</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {variants.length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-600">Ebat / varyant</label>
            <select
              value={form.variantLabel}
              onChange={(e) => setForm({ ...form, variantLabel: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Seçin</option>
              {variants.map((v) => (
                <option key={v.label} value={v.label}>{v.label}</option>
              ))}
            </select>
          </div>
        )}

        {!form.dealerProductId && (
          <input
            placeholder="Ürün adı (serbest sipariş)"
            value={form.productName}
            onChange={(e) => setForm({ ...form, productName: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        )}

        <input required type="number" min={1} placeholder="Adet" value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          className="w-full rounded-lg border px-3 py-2 text-sm" />

        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Müşteri adı" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            className="rounded-lg border px-3 py-2 text-sm" />
          <input placeholder="Telefon" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
            className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <input placeholder="İl / ilçe" value={form.customerCity} onChange={(e) => setForm({ ...form, customerCity: e.target.value })}
          className="w-full rounded-lg border px-3 py-2 text-sm" />
        <textarea placeholder="Teslimat adresi" value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
          className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} />

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-800">Zorunlu dosyalar</p>
          <div className="flex gap-2">
            <label className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 border rounded-lg text-xs cursor-pointer bg-white hover:bg-gray-50">
              <Upload size={14} /> {uploading === "image" ? "…" : "Ürün foto *"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "image"); }} />
            </label>
            <label className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 border rounded-lg text-xs cursor-pointer bg-white hover:bg-gray-50">
              <FileText size={14} /> {uploading === "pdf" ? "…" : "Sipariş PDF *"}
              <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "pdf"); }} />
            </label>
          </div>
          {form.orderImageUrl && form.orderPdfUrl && (
            <p className="text-xs text-emerald-700">Dosyalar yüklendi ✓</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !form.orderImageUrl || !form.orderPdfUrl}
          className="w-full py-3 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-40 inline-flex items-center justify-center gap-2"
        >
          <ShoppingCart size={16} /> {submitting ? "Oluşturuluyor…" : "Siparişi Oluştur"}
        </button>
      </form>
    </div>
  );
}

export default function ManualOrderPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Yükleniyor…</div>}>
      <ManualOrderForm />
    </Suspense>
  );
}
