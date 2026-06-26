"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Pencil } from "lucide-react";
import { POD_CORE_SOURCE } from "@/lib/pod-core/pod-types";
import type { PodUiRole } from "@/lib/pod-core/pod-ui-bridge";
import { podBasePath } from "@/lib/pod-core/pod-ui-bridge";

type ProjectRow = {
  projectId: string;
  projectName: string;
  templateName: string;
  updatedAt: string;
  pricingSnapshot?: { finalPrice?: number | null };
  widthCm?: number;
  heightCm?: number;
};

type Props = {
  role: PodUiRole;
  newDesignHref?: string;
};

export function PodProjectList({ role, newDesignHref }: Props) {
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const base = podBasePath(role);
  const createHref = newDesignHref ?? `${base}/designs?new=1`;

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/pod/projects?source=${POD_CORE_SOURCE}`);
    const d = await r.json();
    if (d.success) {
      setItems(
        (d.data.items || []).map((p: ProjectRow & { templateName?: string }) => ({
          projectId: p.projectId,
          projectName: p.projectName,
          templateName: p.templateName || "—",
          updatedAt: p.updatedAt,
          pricingSnapshot: p.pricingSnapshot,
        })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Tasarımlarım</h1>
          <p className="text-sm text-ena-light/60 mt-1">POD Core kayıtlı projeler</p>
        </div>
        <Link
          href={createHref}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
        >
          Yeni tasarım
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-emerald-400" size={24} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ena-border bg-ena-card/20 p-10 text-center">
          <p className="text-sm font-medium text-white">Henüz POD tasarımınız yok.</p>
          <p className="text-xs text-ena-light/60 mt-2">İlk tasarımınızı oluşturun.</p>
          <Link href={createHref} className="inline-block mt-4 text-sm text-emerald-400 hover:underline">
            Tasarım stüdyosunu aç →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ena-border bg-ena-card/30">
          <table className="w-full text-sm">
            <thead className="text-ena-light/60 text-xs">
              <tr>
                <th className="px-4 py-2 text-left">Tasarım</th>
                <th className="px-4 py-2 text-left">Ürün</th>
                <th className="px-4 py-2 text-left">Fiyat</th>
                <th className="px-4 py-2 text-left">Son kayıt</th>
                <th className="px-4 py-2 text-left" />
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.projectId} className="border-t border-ena-border/60">
                  <td className="px-4 py-2 font-medium text-white">{d.projectName}</td>
                  <td className="px-4 py-2 text-ena-light">{d.templateName}</td>
                  <td className="px-4 py-2 text-white">
                    {d.pricingSnapshot?.finalPrice != null
                      ? `₺${d.pricingSnapshot.finalPrice.toLocaleString("tr-TR")}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-ena-light/70">
                    {new Date(d.updatedAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`${createHref}&project=${d.projectId}`}
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                    >
                      <Pencil size={12} /> Aç
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
