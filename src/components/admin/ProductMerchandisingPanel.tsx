"use client";

import { useEffect, useState } from "react";
import { Percent, LayoutGrid, Sparkles, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  VARIANT_DISPLAY_LABELS,
  VARIANT_DISPLAY_MODES,
  type VariantDisplayMode,
} from "@/lib/products/variant-display";
import { CAM_TABLO_EBAT_PRESET, normalizeVariantOptions } from "@/lib/products/cam-tablo-ebat";

export interface ProductMerchandisingState {
  variantDisplayMode: VariantDisplayMode;
  salePrice: string;
  discountLabel: string;
  campaignIds: string[];
}

interface CampaignOption {
  id: string;
  name: string;
  active: boolean;
}

interface Props {
  value: ProductMerchandisingState;
  onChange: (next: ProductMerchandisingState) => void;
  productId?: string;
  category?: string;
  onLoadCamTabloEbat?: (options: string[]) => void;
  variantGroups?: { name: string; options: string[] }[];
  onNormalizeOptions?: (groups: { name: string; options: string[] }[]) => void;
}

export function ProductMerchandisingPanel({
  value,
  onChange,
  productId,
  category,
  onLoadCamTabloEbat,
  variantGroups,
  onNormalizeOptions,
}: Props) {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [fixingTypos, setFixingTypos] = useState(false);
  const ic =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none";

  useEffect(() => {
    fetch("/api/admin/campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns((d.data || []).map((c: CampaignOption) => ({ id: c.id, name: c.name, active: c.active }))));
  }, []);

  const patch = (partial: Partial<ProductMerchandisingState>) =>
    onChange({ ...value, ...partial });

  const toggleCampaign = (id: string) => {
    const next = value.campaignIds.includes(id)
      ? value.campaignIds.filter((c) => c !== id)
      : [...value.campaignIds, id];
    patch({ campaignIds: next });
  };

  const loadCamTabloPreset = () => {
    const opts = [...CAM_TABLO_EBAT_PRESET];
    if (onLoadCamTabloEbat) {
      onLoadCamTabloEbat(opts);
      toast.success(`${opts.length} Cam Tablo ebatı yüklendi`);
      return;
    }
    toast.error("Önce varyant bölümünde Ebat grubu ekleyin");
  };

  const fixLocalTypos = () => {
    if (!variantGroups || !onNormalizeOptions) {
      toast.error("Varyant grubu bulunamadı");
      return;
    }
    const normalized = variantGroups.map((g) => ({
      ...g,
      options: normalizeVariantOptions(g.options),
    }));
    onNormalizeOptions(normalized);
    toast.success("Yerel seçenekler düzeltildi");
  };

  const fixDbTypos = async () => {
    setFixingTypos(true);
    try {
      const res = await fetch("/api/admin/variants/fix-typos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: productId ? [productId] : [] }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`${d.data?.fixed || 0} kayıt düzeltildi`);
        fixLocalTypos();
      } else toast.error(d.error || "Hata");
    } catch {
      toast.error("İşlem başarısız");
    }
    setFixingTypos(false);
  };

  const isCamTablo = (category || "").toLowerCase().includes("cam tablo");

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <LayoutGrid size={16} /> Varyant Gösterimi
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          Mağaza sayfasında müşterinin ebat/renk seçiminin nasıl görüneceğini belirleyin.
        </p>
        <select
          className={ic}
          value={value.variantDisplayMode}
          onChange={(e) =>
            patch({ variantDisplayMode: e.target.value as VariantDisplayMode })
          }
        >
          {VARIANT_DISPLAY_MODES.map((m) => (
            <option key={m} value={m}>
              {VARIANT_DISPLAY_LABELS[m]}
            </option>
          ))}
        </select>
        {(isCamTablo || onLoadCamTabloEbat) && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadCamTabloPreset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            >
              <Sparkles size={13} /> Cam Tablo Ebat Listesi
            </button>
            <button
              type="button"
              onClick={fixLocalTypos}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
            >
              <Wand2 size={13} /> İmla Düzelt (yerel)
            </button>
            {productId && (
              <button
                type="button"
                disabled={fixingTypos}
                onClick={fixDbTypos}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                <Wand2 size={13} /> {fixingTypos ? "Düzeltiliyor..." : "İmla Düzelt (kayıtlı)"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Percent size={16} /> İndirim & Kampanya
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
              İndirimli Fiyat (₺)
            </label>
            <input
              type="number"
              step="0.01"
              className={ic}
              value={value.salePrice}
              onChange={(e) => patch({ salePrice: e.target.value })}
              placeholder="0 = indirim yok"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
              İndirim Etiketi
            </label>
            <input
              className={ic}
              value={value.discountLabel}
              onChange={(e) => patch({ discountLabel: e.target.value })}
              placeholder="Örn: %20 İndirim, Kampanya Fiyatı"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
            Kampanyalar
          </label>
          {campaigns.length === 0 ? (
            <p className="text-xs text-gray-400">Henüz kampanya yok. Kampanyalar bölümünden oluşturun.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1.5 border border-gray-100 rounded-lg p-2">
              {campaigns.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={value.campaignIds.includes(c.id)}
                    onChange={() => toggleCampaign(c.id)}
                    className="rounded border-gray-300"
                  />
                  <span>{c.name}</span>
                  {!c.active && (
                    <span className="text-[10px] text-gray-400">(pasif)</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const defaultMerchandisingState = (): ProductMerchandisingState => ({
  variantDisplayMode: "buttons",
  salePrice: "",
  discountLabel: "",
  campaignIds: [],
});
