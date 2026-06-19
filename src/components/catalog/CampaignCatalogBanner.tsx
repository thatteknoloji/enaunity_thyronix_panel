"use client";

import CountdownTimer from "@/components/CountdownTimer";
import { Tag } from "lucide-react";

type Props = {
  campaign: {
    name: string;
    description?: string;
    badge?: string;
    badgeColor?: string;
    discountType?: string;
    discountValue?: number;
    endsAt?: string | null;
    freeShipping?: boolean;
    type?: string;
  };
};

const TYPE_LABELS: Record<string, string> = {
  quantity_discount: "Çoklu alım indirimi",
  bogo: "Alana bedava / indirimli",
  bundle: "Paket fiyatı",
  free_shipping: "Kargo bedava",
  category_discount: "Kategori indirimi",
  first_order: "İlk sipariş indirimi",
  loyalty: "Sadakat indirimi",
};

export function CampaignCatalogBanner({ campaign }: Props) {
  const discountLabel =
    campaign.discountType === "percentage"
      ? `%${campaign.discountValue ?? 0} indirim`
      : campaign.discountValue
        ? `${campaign.discountValue} ₺ indirim`
        : null;

  return (
    <div className="mb-8 rounded-xl border border-ena-primary/30 bg-gradient-to-r from-ena-primary/10 via-ena-card to-ena-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Tag size={14} className="text-ena-primary shrink-0" />
            {(campaign.badge || campaign.name) && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: campaign.badgeColor || "#e50914" }}
              >
                {campaign.badge || campaign.name}
              </span>
            )}
            {campaign.type && (
              <span className="text-xs text-ena-light">{TYPE_LABELS[campaign.type] || campaign.type}</span>
            )}
          </div>
          <h2 className="text-xl font-bold text-ena-text">{campaign.name}</h2>
          {campaign.description && (
            <p className="text-sm text-ena-light max-w-2xl">{campaign.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            {discountLabel && (
              <span className="px-2 py-1 rounded-md bg-ena-primary/15 text-ena-primary font-semibold">
                {discountLabel}
              </span>
            )}
            {campaign.freeShipping && (
              <span className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold">
                Kargo bedava
              </span>
            )}
          </div>
        </div>
        {campaign.endsAt && (
          <div className="shrink-0">
            <CountdownTimer endsAt={campaign.endsAt} label="Kampanya bitişine" />
          </div>
        )}
      </div>
    </div>
  );
}
