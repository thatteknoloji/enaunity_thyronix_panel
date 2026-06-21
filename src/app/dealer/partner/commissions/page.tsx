"use client";

import { useEffect, useState } from "react";
import { PartnerDealerShell } from "@/components/partners/PartnerDealerShell";

const TYPE_LABELS: Record<string, string> = {
  FIRST_ORDER: "İlk Sipariş",
  RECURRING_ORDER: "Tekrarlayan",
  MODULE_LICENSE: "Modül Lisansı",
  POD_SALE: "POD Satışı",
  POD_ORDER: "POD Satışı",
  NETWORK_OVERRIDE: "Ağ Override",
  PRODUCT_ORDER: "Ürün Siparişi",
  MANUAL: "Manuel",
};

export default function DealerPartnerCommissionsPage() {
  const [rows, setRows] = useState<Array<{ id: string; amount: number; status: string; commissionType: string; createdAt: string }>>([]);

  useEffect(() => {
    fetch("/api/dealer/partner").then((r) => r.json()).then((d) => {
      if (d.success) setRows(d.data.commissions || []);
    });
  }, []);

  return (
    <PartnerDealerShell title="Komisyonlar" description="Partner komisyon geçmişiniz">
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-ena-border bg-ena-card px-4 py-3 text-sm flex justify-between items-center">
            <div>
              <span className="text-white">{TYPE_LABELS[r.commissionType] || r.commissionType}</span>
              <span className="text-ena-light text-xs ml-2">{r.status}</span>
            </div>
            <span className="font-semibold text-cyan-400">{Number(r.amount).toFixed(2)} ₺</span>
          </li>
        ))}
        {!rows.length && <li className="text-ena-light text-sm">Henüz komisyon kaydı yok</li>}
      </ul>
    </PartnerDealerShell>
  );
}
