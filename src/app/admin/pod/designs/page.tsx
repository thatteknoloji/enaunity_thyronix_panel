"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Palette } from "lucide-react";
import { PodAdminShell } from "@/components/pod/PodAdminShell";
import { toAdminUrl } from "@/lib/auth/admin-access";

type ProjectRow = {
  projectId: string;
  projectName: string;
  templateName: string;
  category: string;
  widthCm: number;
  heightCm: number;
  quantity: number;
  finalPrice: number | null;
  updatedAt: string;
};

export default function AdminPodDesignsPage() {
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/pod/profiles")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setItems(d.data.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PodAdminShell title="POD Tasarımları" description="POD Core proje kayıtları">
      <div className="mb-4">
        <Link
          href={toAdminUrl("/admin/pod-tasarim-studyo")}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Palette size={16} /> Tasarım Stüdyosu
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <p className="text-sm font-medium text-gray-700">Henüz POD tasarımı yok.</p>
          <p className="text-xs text-gray-500 mt-2">
            Tasarım Stüdyosu&apos;nda yeni tasarım oluşturun — kayıtlar burada listelenir.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Tasarım</th>
                <th className="px-4 py-2 text-left">Ürün</th>
                <th className="px-4 py-2 text-left">Boyut</th>
                <th className="px-4 py-2 text-left">Fiyat</th>
                <th className="px-4 py-2 text-left">Son kayıt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.projectId} className="border-t">
                  <td className="px-4 py-2 font-medium text-gray-900">{d.projectName}</td>
                  <td className="px-4 py-2">
                    {d.templateName}
                    <span className="block text-[10px] text-gray-400">{d.category}</span>
                  </td>
                  <td className="px-4 py-2">
                    {d.widthCm}×{d.heightCm} cm · {d.quantity} adet
                  </td>
                  <td className="px-4 py-2">
                    {d.finalPrice != null ? `₺${d.finalPrice.toLocaleString("tr-TR")}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(d.updatedAt).toLocaleString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PodAdminShell>
  );
}
