"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DealerPartnerReferralsPage() {
  const [rows, setRows] = useState<Array<{ id: string; status: string; createdAt: string; landingPath: string }>>([]);
  useEffect(() => {
    fetch("/api/dealer/partner").then((r) => r.json()).then((d) => { if (d.success) setRows(d.data.referrals || []); });
  }, []);

  return (
    <div className="max-w-3xl">
      <Link href="/dealer/partner" className="text-sm text-cyan-400 hover:underline">← Partner Merkezi</Link>
      <h1 className="text-2xl font-bold text-white mt-4 mb-6">Referanslarım</h1>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-ena-border bg-ena-card px-4 py-3 text-sm flex justify-between">
            <span>{r.status} · {r.landingPath || "/"}</span>
            <span className="text-ena-light text-xs">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</span>
          </li>
        ))}
        {!rows.length && <li className="text-ena-light text-sm">Henüz referans kaydı yok</li>}
      </ul>
    </div>
  );
}
