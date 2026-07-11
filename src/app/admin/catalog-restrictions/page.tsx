"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Search, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";

const GROUPS = ["bronze", "silver", "gold"];

interface Restriction {
  id: string;
  group: string;
  productId: string;
  product: { id: string; name: string };
}

export default function AdminCatalogRestrictionsPage() {
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newGroup, setNewGroup] = useState("bronze");
  const [newProductId, setNewProductId] = useState("");

  const load = useCallback(async () => {
    const [rRes, pRes] = await Promise.all([
      fetch("/api/admin/catalog-restrictions"),
      fetch("/api/products"),
    ]);
    const rData = await rRes.json();
    const pData = await pRes.json();
    if (rData.success) setRestrictions(rData.data);
    if (pData.success) setProducts(pData.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = restrictions.filter((r) =>
    r.product.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newProductId) return;
    const res = await fetch("/api/admin/catalog-restrictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group: newGroup, productId: newProductId }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Kısıtlama eklendi");
      setNewProductId("");
      load();
    } else {
      toast.error(data.error || "Hata");
    }
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/admin/catalog-restrictions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("Kısıtlama kaldırıldı");
    load();
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-gray-200" /><div className="h-64 rounded bg-gray-200" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Katalog Kısıtlamaları</h1>
        <p className="text-sm text-gray-500 mt-1">Gruplara özel ürün görünürlüğünü yönetin (kısıtlanan ürünler gizlenir)</p>
      </div>

      {/* Add new */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Yeni Kısıtlama Ekle</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <Select value={newGroup} onChange={(e) => setNewGroup(e.target.value)} className="w-32">
            {GROUPS.map((g) => <option key={g} value={g}>{g.toUpperCase()}</option>)}
          </Select>
          <div className="flex-1 min-w-[200px]">
            <select
              value={newProductId}
              onChange={(e) => setNewProductId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Ürün seçin</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus size={16} /> Kısıtla
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ürün ara..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Grup</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Ürün</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/80">
                <td className="px-5 py-3">
                  <span className="uppercase font-medium text-xs bg-ena-primary/10 text-ena-primary px-2 py-0.5 rounded">
                    {r.group}
                  </span>
                </td>
                <td className="px-5 py-3 font-medium text-gray-900">{r.product.name}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1.5 text-gray-400 hover:text-ena-primary transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={3} className="text-center py-8 text-gray-400">Kısıtlama bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
