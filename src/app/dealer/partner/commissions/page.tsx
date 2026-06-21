"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DealerPartnerCommissionsPage() {
  const [rows, setRows] = useState<Array<{ id: string; amount: number; status: string; commissionType: string }>>([]);
  useEffect(() => {
    fetch("/api/dealer/partner").then((r) => r.json()).then((d) => { if (d.success) setRows(d.data.commissions || []); });
  }, []);

  return (
    <div className="max-w-3xl">
      <Link href="/dealer/partner" className="text-sm text-cyan-400 hover:underline">← Partner Merkezi</Link>
      <h1 className="text-2xl font-bold text-white mt-4 mb-6">Komisyonlarım</h1>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-ena-border bg-ena-card px-4 py-3 text-sm flex justify-between">
            <span>{r.commissionType} · {r.status}</span>
            <span className="font-semibold text-cyan-400">{Number(r.amount).toFixed(2)} ₺</span>
          </li>
        ))}
        {!rows.length && <li className="text-ena-light text-sm">Henüz komisyon kaydı yok</li>}
      </ul>
    </div>
  );
}
