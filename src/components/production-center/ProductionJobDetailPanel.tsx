"use client";

import { useEffect, useState } from "react";
import {
  X,
  Save,
  Download,
  Image as ImageIcon,
  FileText,
  Truck,
  CheckCircle2,
  Factory,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import type { ProductionJobDto } from "@/lib/production-center/types";
import {
  PRODUCTION_PRIORITIES,
  PRODUCTION_STATUSES,
} from "@/lib/production-center/types";
import {
  PRODUCTION_PRIORITY_LABELS,
  PRODUCTION_SOURCE_LABELS,
  PRODUCTION_STATUS_LABELS,
} from "@/lib/production-center/kanban";

type Props = {
  job: ProductionJobDto | null;
  onClose: () => void;
  onUpdated: (job: ProductionJobDto) => void;
};

function FileRow({
  label,
  url,
  onChange,
}: {
  label: string;
  url: string;
  onChange: (v: string) => void;
}) {
  const downloadable = url.startsWith("http") || url.startsWith("data:") || url.startsWith("/");
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-ena-text-muted w-28 shrink-0">{label}</span>
      <input
        value={url}
        onChange={(e) => onChange(e.target.value)}
        placeholder="URL veya yol"
        className="flex-1 rounded border border-ena-border bg-ena-dark/60 px-2 py-1 text-[11px]"
      />
      {downloadable && (
        <a
          href={url}
          download
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded border border-ena-border px-2 py-1 text-[10px] text-emerald-600 hover:bg-white/5"
        >
          <Download className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

export function ProductionJobDetailPanel({ job, onClose, onUpdated }: Props) {
  const [draft, setDraft] = useState<ProductionJobDto | null>(job);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(job);
  }, [job]);

  if (!job || !draft) return null;

  const patch = (data: Partial<ProductionJobDto>) => setDraft((d) => (d ? { ...d, ...data } : d));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/production/jobs/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: draft.status,
          priority: draft.priority,
          machineName: draft.machineName,
          operatorName: draft.operatorName,
          estimatedMinutes: draft.estimatedMinutes,
          notes: draft.notes,
          qualityPassed: draft.qualityPassed,
          qualityNote: draft.qualityNote,
          qualityPhotoUrl: draft.qualityPhotoUrl,
          trackingNumber: draft.trackingNumber,
          shipmentCompany: draft.shipmentCompany,
          previewImage: draft.previewImage,
          productionImage: draft.productionImage,
          pdfPath: draft.pdfPath,
          svgPath: draft.svgPath,
          productionPackPath: draft.productionPackPath,
          shipped: draft.status === "SHIPPED" && !draft.shippedAt,
          delivered: draft.status === "COMPLETED" && !draft.deliveredAt,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Kayıt başarısız");
      onUpdated(json.data);
      toast.success("Üretim işi güncellendi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = draft.previewImage || draft.productionImage;
  const hasPack = Boolean(draft.productionPackPath);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Kapat" />
      <aside className="relative w-full max-w-lg bg-ena-dark border-l border-ena-border shadow-2xl flex flex-col max-h-screen overflow-hidden">
        <header className="flex items-center justify-between border-b border-ena-border px-4 py-3 shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">Üretim Detayı</p>
            <h2 className="text-lg font-bold text-ena-text font-mono">{draft.jobNumber}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-ena-text-muted">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <section className="rounded-xl border border-ena-border bg-white/5 p-3 space-y-2">
            <h3 className="text-xs font-semibold text-ena-text">Ürün Bilgileri</h3>
            <p className="text-sm font-medium text-ena-text">{draft.productType}</p>
            <p className="text-xs text-ena-text-muted">
              {draft.variant && `${draft.variant} • `}
              {draft.widthCm > 0 && draft.heightCm > 0 ? `${draft.widthCm}×${draft.heightCm} cm • ` : ""}
              {draft.quantity} adet
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="text-[10px] space-y-1">
                <span className="text-ena-text-muted">Durum</span>
                <select
                  value={draft.status}
                  onChange={(e) => patch({ status: e.target.value })}
                  className="w-full rounded border border-ena-border bg-ena-dark/60 px-2 py-1.5 text-xs"
                >
                  {PRODUCTION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PRODUCTION_STATUS_LABELS[s] ?? s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[10px] space-y-1">
                <span className="text-ena-text-muted">Öncelik</span>
                <select
                  value={draft.priority}
                  onChange={(e) => patch({ priority: e.target.value })}
                  className="w-full rounded border border-ena-border bg-ena-dark/60 px-2 py-1.5 text-xs"
                >
                  {PRODUCTION_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRODUCTION_PRIORITY_LABELS[p] ?? p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-ena-border bg-white/5 p-3 space-y-2">
            <h3 className="text-xs font-semibold text-ena-text flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> Production Pack
            </h3>
            {hasPack ? (
              <p className="text-xs text-emerald-600 font-mono break-all">{draft.productionPackPath}</p>
            ) : (
              <p className="text-xs text-ena-text-muted italic">Henüz oluşturulmadı.</p>
            )}
          </section>

          {previewUrl && (
            <section className="rounded-xl border border-ena-border overflow-hidden">
              <div className="px-3 py-2 border-b border-ena-border bg-white/5 text-xs font-semibold text-ena-text flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Mockup / Önizleme
              </div>
              <div className="p-3 bg-black/20 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Önizleme" className="max-h-40 rounded object-contain" />
              </div>
            </section>
          )}

          <section className="rounded-xl border border-ena-border bg-white/5 p-3 space-y-2">
            <h3 className="text-xs font-semibold text-ena-text flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Dosyalar
            </h3>
            <FileRow label="Production PNG" url={draft.productionImage} onChange={(v) => patch({ productionImage: v })} />
            <FileRow label="Preview PNG" url={draft.previewImage} onChange={(v) => patch({ previewImage: v })} />
            <FileRow label="PDF" url={draft.pdfPath} onChange={(v) => patch({ pdfPath: v })} />
            <FileRow label="SVG" url={draft.svgPath} onChange={(v) => patch({ svgPath: v })} />
            {draft.metadata && Object.keys(draft.metadata).length > 0 && (
              <details className="text-[10px]">
                <summary className="cursor-pointer text-ena-text-muted py-1">Metadata</summary>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-ena-text-muted">
                  {JSON.stringify(draft.metadata, null, 2)}
                </pre>
              </details>
            )}
          </section>

          {draft.pricingSnapshot && Object.keys(draft.pricingSnapshot).length > 0 && (
            <section className="rounded-xl border border-ena-border bg-white/5 p-3">
              <h3 className="text-xs font-semibold text-ena-text mb-2">Pricing Snapshot</h3>
              <pre className="text-[10px] text-ena-text-muted overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(draft.pricingSnapshot, null, 2)}
              </pre>
            </section>
          )}

          <section className="rounded-xl border border-ena-border bg-white/5 p-3 space-y-2">
            <h3 className="text-xs font-semibold text-ena-text flex items-center gap-1.5">
              <Factory className="h-3.5 w-3.5" /> Sipariş & Bayi
            </h3>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <dt className="text-ena-text-muted">Kaynak</dt>
              <dd>{PRODUCTION_SOURCE_LABELS[draft.orderSource] ?? draft.orderSource}</dd>
              <dt className="text-ena-text-muted">Sipariş</dt>
              <dd className="font-mono truncate">{draft.orderId || "—"}</dd>
              <dt className="text-ena-text-muted">Bayi</dt>
              <dd>{draft.dealerName || "—"}</dd>
              <dt className="text-ena-text-muted">Müşteri</dt>
              <dd>{draft.customerName || "—"}</dd>
            </dl>
          </section>

          <section className="rounded-xl border border-ena-border bg-white/5 p-3 space-y-2">
            <h3 className="text-xs font-semibold text-ena-text">Makine</h3>
            <input
              value={draft.machineName}
              onChange={(e) => patch({ machineName: e.target.value })}
              placeholder="Makine adı"
              className="w-full rounded border border-ena-border bg-ena-dark/60 px-2 py-1.5 text-xs"
            />
            <input
              value={draft.operatorName}
              onChange={(e) => patch({ operatorName: e.target.value })}
              placeholder="Operatör"
              className="w-full rounded border border-ena-border bg-ena-dark/60 px-2 py-1.5 text-xs"
            />
            <input
              type="number"
              min={0}
              value={draft.estimatedMinutes}
              onChange={(e) => patch({ estimatedMinutes: Number(e.target.value) })}
              placeholder="Tahmini süre (dk)"
              className="w-full rounded border border-ena-border bg-ena-dark/60 px-2 py-1.5 text-xs"
            />
          </section>

          <section className="rounded-xl border border-ena-border bg-white/5 p-3 space-y-2">
            <h3 className="text-xs font-semibold text-ena-text flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Kalite
            </h3>
            <label className="flex items-center gap-2 text-xs text-ena-text">
              <input
                type="checkbox"
                checked={draft.qualityPassed}
                onChange={(e) => patch({ qualityPassed: e.target.checked })}
              />
              Kalite kontrol edildi
            </label>
            <textarea
              value={draft.qualityNote}
              onChange={(e) => patch({ qualityNote: e.target.value })}
              placeholder="Kalite notu"
              rows={2}
              className="w-full rounded border border-ena-border bg-ena-dark/60 px-2 py-1.5 text-xs"
            />
            <div className="rounded-lg border border-dashed border-ena-border px-3 py-4 text-center text-[10px] text-ena-text-muted">
              Fotoğraf upload — yakında
              <input
                value={draft.qualityPhotoUrl}
                onChange={(e) => patch({ qualityPhotoUrl: e.target.value })}
                placeholder="Geçici: fotoğraf URL"
                className="mt-2 w-full rounded border border-ena-border bg-ena-dark/60 px-2 py-1 text-[10px]"
              />
            </div>
          </section>

          <section className="rounded-xl border border-ena-border bg-white/5 p-3 space-y-2">
            <h3 className="text-xs font-semibold text-ena-text flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" /> Kargo
            </h3>
            <input
              value={draft.trackingNumber}
              onChange={(e) => patch({ trackingNumber: e.target.value })}
              placeholder="Takip no"
              className="w-full rounded border border-ena-border bg-ena-dark/60 px-2 py-1.5 text-xs"
            />
            <input
              value={draft.shipmentCompany}
              onChange={(e) => patch({ shipmentCompany: e.target.value })}
              placeholder="Kargo firması"
              className="w-full rounded border border-ena-border bg-ena-dark/60 px-2 py-1.5 text-xs"
            />
            <div className="flex gap-2 text-[10px]">
              <span className={draft.shippedAt ? "text-emerald-600" : "text-ena-text-muted"}>
                {draft.shippedAt ? `Gönderildi: ${new Date(draft.shippedAt).toLocaleString("tr-TR")}` : "Gönderilmedi"}
              </span>
              <span className={draft.deliveredAt ? "text-emerald-600" : "text-ena-text-muted"}>
                {draft.deliveredAt ? `Teslim: ${new Date(draft.deliveredAt).toLocaleString("tr-TR")}` : ""}
              </span>
            </div>
          </section>

          <textarea
            value={draft.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Not"
            rows={3}
            className="w-full rounded border border-ena-border bg-ena-dark/60 px-2 py-1.5 text-xs"
          />
        </div>

        <footer className="border-t border-ena-border p-4 shrink-0">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
