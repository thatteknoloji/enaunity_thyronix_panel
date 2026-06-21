"use client";

import { useEffect, useState } from "react";
import { PartnerAdminShell } from "@/components/partners/PartnerAdminShell";
import toast from "react-hot-toast";

export default function AdminPartnersAffiliatesPage() {
  const [rows, setRows] = useState<Array<{ id: string; referralCode: string; referralLink: string; partnerType: string }>>([]);

  useEffect(() => {
    fetch("/api/admin/partners/affiliates").then((r) => r.json()).then((d) => {
      if (d.success) setRows(d.data.affiliates || []);
    });
  }, []);

  return (
    <PartnerAdminShell title="Affiliate Program" description="Aktif affiliate partnerler ve referans linkleri">
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-mono">{r.referralCode}</span>
            <button
              type="button"
              className="text-cyan-600 text-xs hover:underline"
              onClick={() => {
                navigator.clipboard.writeText(r.referralLink);
                toast.success("Link kopyalandı");
              }}
            >
              Linki kopyala
            </button>
          </li>
        ))}
        {!rows.length && <li className="text-gray-400 text-sm">Aktif affiliate yok</li>}
      </ul>
    </PartnerAdminShell>
  );
}
