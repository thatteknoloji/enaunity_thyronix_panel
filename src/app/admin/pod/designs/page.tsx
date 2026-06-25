"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PodAdminShell } from "@/components/pod/PodAdminShell";

type Design = {
  id: string;
  title: string;
  fileType: string;
  thumbnailUrl: string;
  dealerId: string | null;
  width: number;
  height: number;
  createdAt: string;
};

export default function AdminPodDesignsPage() {
  const [items, setItems] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pod/designs?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setItems(d.data.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PodAdminShell title="POD Tasarımları" description="Tüm bayi tasarımları">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={24} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Tasarım</th>
                <th className="px-4 py-2 text-left">Tip</th>
                <th className="px-4 py-2 text-left">Boyut</th>
                <th className="px-4 py-2 text-left">Dealer</th>
                <th className="px-4 py-2 text-left">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-2 flex items-center gap-2">
                    {d.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.thumbnailUrl} alt="" className="w-8 h-8 rounded object-cover" />
                    )}
                    {d.title}
                  </td>
                  <td className="px-4 py-2">{d.fileType}</td>
                  <td className="px-4 py-2">{d.width}×{d.height}</td>
                  <td className="px-4 py-2 font-mono text-xs">{d.dealerId?.slice(0, 8) || "—"}</td>
                  <td className="px-4 py-2">{new Date(d.createdAt).toLocaleDateString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PodAdminShell>
  );
}
