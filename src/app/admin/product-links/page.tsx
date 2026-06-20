"use client";

import { useEffect, useState } from "react";
import { Link2, Trash2, RefreshCw, Ban, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminProductLinksPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ productType: "", status: "" });
  const [acting, setActing] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.productType) params.set("productType", filter.productType);
    if (filter.status) params.set("status", filter.status);
    fetch(`/api/admin/product-links?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setLinks(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [filter.productType, filter.status]);

  const handleAction = async (linkId: string, action: string) => {
    setActing(linkId + action);
    try {
      const res = await fetch("/api/admin/product-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, action }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("İşlem başarılı");
        loadData();
      } else {
        toast.error(d.error || "Hata");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setActing(null);
    }
  };

  const statusColors: Record<string, string> = {
    LINKED: "bg-green-500/10 text-green-400",
    PENDING: "bg-amber-500/10 text-amber-400",
    DISABLED: "bg-gray-500/10 text-gray-400",
    DELETED: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ena-text flex items-center gap-2">
          <Link2 size={24} /> Product Links
        </h1>
        <p className="text-sm text-ena-text-muted mt-1">ENA ↔ THYRONIX / HIVE hesap eşleştirmeleri</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filter.productType} onChange={(e) => setFilter({ ...filter, productType: e.target.value })}
          className="rounded-lg border border-ena-border bg-ena-card px-3 py-2 text-sm text-ena-text">
          <option value="">Tüm Ürünler</option>
          <option value="THYRONIX">THYRONIX</option>
          <option value="HIVE">HIVE</option>
        </select>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="rounded-lg border border-ena-border bg-ena-card px-3 py-2 text-sm text-ena-text">
          <option value="">Tüm Durumlar</option>
          <option value="LINKED">LINKED</option>
          <option value="PENDING">PENDING</option>
          <option value="DISABLED">DISABLED</option>
          <option value="DELETED">DELETED</option>
        </select>
      </div>

      <div className="rounded-xl border border-ena-border bg-ena-card table-scroll">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-ena-border">
              <th className="px-4 py-3 text-left text-ena-text-muted">ENA User</th>
              <th className="px-4 py-3 text-left text-ena-text-muted">Product</th>
              <th className="px-4 py-3 text-left text-ena-text-muted">External User</th>
              <th className="px-4 py-3 text-left text-ena-text-muted">Status</th>
              <th className="px-4 py-3 text-left text-ena-text-muted">Linked At</th>
              <th className="px-4 py-3 text-left text-ena-text-muted">Last Login</th>
              <th className="px-4 py-3 text-right text-ena-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ena-border">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center"><Loader2 className="animate-spin inline" size={20} /></td></tr>
            ) : links.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ena-text-muted">Henüz bağlantı yok</td></tr>
            ) : links.map((link) => (
              <tr key={link.id} className="hover:bg-white/5">
                <td className="px-4 py-3">
                  <p className="text-ena-text font-medium">{link.enaUser?.name || "—"}</p>
                  <p className="text-xs text-ena-text-muted">{link.enaUser?.email}</p>
                </td>
                <td className="px-4 py-3 text-ena-text">{link.productType}</td>
                <td className="px-4 py-3">
                  <p className="text-ena-text">{link.externalUsername || link.externalEmail}</p>
                  <p className="text-xs text-ena-text-muted">{link.externalEmail}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[link.status] || ""}`}>{link.status}</span>
                </td>
                <td className="px-4 py-3 text-ena-text-muted text-xs">
                  {link.linkedAt ? new Date(link.linkedAt).toLocaleString("tr-TR") : "—"}
                </td>
                <td className="px-4 py-3 text-ena-text-muted text-xs">
                  {link.lastLoginAt ? new Date(link.lastLoginAt).toLocaleString("tr-TR") : "—"}
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  {link.status === "DISABLED" ? (
                    <button onClick={() => handleAction(link.id, "enable")} disabled={!!acting}
                      className="px-2 py-1 text-xs text-green-400 hover:bg-green-500/10 rounded" title="Etkinleştir">
                      {acting === link.id + "enable" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    </button>
                  ) : link.status === "LINKED" ? (
                    <button onClick={() => handleAction(link.id, "disable")} disabled={!!acting}
                      className="px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/10 rounded" title="Disable">
                      {acting === link.id + "disable" ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                    </button>
                  ) : null}
                  <button onClick={() => handleAction(link.id, "relink")} disabled={!!acting}
                    className="px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/10 rounded" title="Yeniden Eşleştir">
                    {acting === link.id + "relink" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  </button>
                  <button onClick={() => handleAction(link.id, "delete")} disabled={!!acting}
                    className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded" title="Link Kaldır">
                    {acting === link.id + "delete" ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
