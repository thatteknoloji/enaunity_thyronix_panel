"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Upload, FileText, ShoppingCart } from "lucide-react";
import { parseVariants } from "@/lib/dealer-products/types";
import {
  DealerField,
  DealerPanel,
  DealerSubPage,
  dealerInputClass,
  dealerSelectClass,
} from "@/components/dealer/DealerSubPage";

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
    <DealerSubPage
      title="Manuel Sipariş"
      description="Foto + PDF zorunlu — operasyon paneline düşer"
      backHref="/dealer/my-products"
      icon={ShoppingCart}
      maxWidth="md"
    >
      <form onSubmit={submit} className="space-y-4">
        <DealerPanel className="p-5 space-y-4">
          <DealerField label="Bayi ürünü (opsiyonel)">
            <select
              value={form.dealerProductId}
              onChange={(e) => setForm({ ...form, dealerProductId: e.target.value, variantLabel: "" })}
              className={dealerSelectClass}
            >
              <option value="">Serbest / yeni ürün</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </DealerField>

          {variants.length > 0 && (
            <DealerField label="Ebat / varyant">
              <select
                value={form.variantLabel}
                onChange={(e) => setForm({ ...form, variantLabel: e.target.value })}
                className={dealerSelectClass}
              >
                <option value="">Seçin</option>
                {variants.map((v) => (
                  <option key={v.label} value={v.label}>
                    {v.label}
                  </option>
                ))}
              </select>
            </DealerField>
          )}

          {!form.dealerProductId && (
            <input
              placeholder="Ürün adı (serbest sipariş)"
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
              className={dealerInputClass}
            />
          )}

          <input
            required
            type="number"
            min={1}
            placeholder="Adet"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className={dealerInputClass}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Müşteri adı"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className={dealerInputClass}
            />
            <input
              placeholder="Telefon"
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              className={dealerInputClass}
            />
          </div>
          <input
            placeholder="İl / ilçe"
            value={form.customerCity}
            onChange={(e) => setForm({ ...form, customerCity: e.target.value })}
            className={dealerInputClass}
          />
          <textarea
            placeholder="Teslimat adresi"
            value={form.customerAddress}
            onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
            className={dealerInputClass}
            rows={2}
          />

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-200">Zorunlu dosyalar</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 border border-white/10 rounded-lg text-xs cursor-pointer bg-ena-dark/40 hover:bg-white/5 text-ena-light">
                <Upload size={14} /> {uploading === "image" ? "…" : "Ürün foto *"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile(f, "image");
                  }}
                />
              </label>
              <label className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 border border-white/10 rounded-lg text-xs cursor-pointer bg-ena-dark/40 hover:bg-white/5 text-ena-light">
                <FileText size={14} /> {uploading === "pdf" ? "…" : "Sipariş PDF *"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile(f, "pdf");
                  }}
                />
              </label>
            </div>
            {form.orderImageUrl && form.orderPdfUrl && (
              <p className="text-xs text-emerald-400">Dosyalar yüklendi ✓</p>
            )}
          </div>
        </DealerPanel>

        <button
          type="submit"
          disabled={submitting || !form.orderImageUrl || !form.orderPdfUrl}
          className="w-full py-3 bg-ena-primary text-white rounded-lg text-sm font-medium disabled:opacity-40 inline-flex items-center justify-center gap-2 hover:bg-ena-primary/90 transition-colors"
        >
          <ShoppingCart size={16} /> {submitting ? "Oluşturuluyor…" : "Siparişi Oluştur"}
        </button>
      </form>
    </DealerSubPage>
  );
}

export default function ManualOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-ena-card/50" />
          <div className="h-64 rounded-xl bg-ena-card/30" />
        </div>
      }
    >
      <ManualOrderForm />
    </Suspense>
  );
}
