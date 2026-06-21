"use client";

import { useEffect, useState } from "react";
import { PartnerAdminShell } from "@/components/partners/PartnerAdminShell";

type App = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  requestedType: string;
  typeLabel: string;
  hasTaxPlate: boolean;
  socialMedia: string;
  applicationNote: string;
  status: string;
  createdAt: string;
};

export default function AdminPartnersApplicationsPage() {
  const [rows, setRows] = useState<App[]>([]);

  const load = () => {
    fetch("/api/admin/partners/applications?status=PENDING")
      .then((r) => r.json())
      .then((d) => { if (d.success) setRows(d.data); });
  };

  useEffect(load, []);

  async function review(id: string, action: "approve" | "reject") {
    await fetch("/api/admin/partners/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    load();
  }

  return (
    <PartnerAdminShell title="Partner Başvuruları" description="Onay bekleyen partner başvuruları">
      <ul className="space-y-3">
        {rows.map((a) => (
          <li key={a.id} className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <div>
                <p className="font-semibold text-gray-900">{a.fullName}</p>
                <p className="text-sm text-gray-500">{a.email} · {a.phone}</p>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded bg-violet-50 text-violet-700">{a.typeLabel}</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Vergi levhası: {a.hasTaxPlate ? "Var" : "Yok"} · Sosyal: {a.socialMedia || "—"}
            </p>
            {a.applicationNote && <p className="text-sm text-gray-600 mb-3">{a.applicationNote}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => review(a.id, "approve")} className="text-xs text-green-600 font-medium hover:underline">Onayla</button>
              <button type="button" onClick={() => review(a.id, "reject")} className="text-xs text-red-600 font-medium hover:underline">Reddet</button>
            </div>
          </li>
        ))}
        {!rows.length && <li className="text-gray-400 text-sm py-8 text-center">Bekleyen başvuru yok</li>}
      </ul>
    </PartnerAdminShell>
  );
}
