"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import toast from "react-hot-toast";

const GROUPS = ["bronze", "silver", "gold"];

interface PriceEntry {
  id: string;
  group: string;
  productId: string;
  price: number;
  product: { id: string; name: string };
}

export default function AdminPriceListsPage() {
  const [entries, setEntries] = useState<PriceEntry[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newGroup, setNewGroup] = useState("bronze");
  const [newProductId, setNewProductId] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const load = useCallback(async () => {
    const [eRes, pRes] = await Promise.all([
      fetch("/api/admin/price-lists"),
      fetch("/api/products"),
    ]);
    const eData = await eRes.json();
    const pData = await pRes.json();
    if (eData.success) setEntries(eData.data);
    if (pData.success) setProducts(pData.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter((e) =>
    e.product.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newProductId || !newPrice) return;
    const res = await fetch("/api/admin/price-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group: newGroup, productId: newProductId, price: newPrice }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Fiyat eklendi");
      setNewProductId("");
      setNewPrice("");
      load();
    } else {
      toast.error(data.error || "Hata");
    }
  };

  const handleUpdate = async (id: string) => {
    await fetch("/api/admin/price-lists", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, price: editPrice }),
    });
    toast.success("Güncellendi");
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/admin/price-lists", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("Silindi");
    load();
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-gray-200" /><div className="h-64 rounded bg-gray-200" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fiyat Listeleri</h1>
        <p className="text-sm text-gray-500 mt-1">Gruplara özel ürün fiyatlarını yönetin</p>
      </div>

      {/* Add new */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Yeni Fiyat Ekle</h2>
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
          <Input
            id="newPrice"
            type="number"
            step="0.01"
            placeholder="Fiyat"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-32"
          />
          <Button onClick={handleCreate} className="gap-2">
            <Plus size={16} /> Ekle
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
              <th className="text-right px-5 py-3 font-semibold text-gray-600">Fiyat</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50/80">
                <td className="px-5 py-3">
                  <span className="uppercase font-medium text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                    {entry.group}
                  </span>
                </td>
                <td className="px-5 py-3 font-medium text-gray-900">{entry.product.name}</td>
                <td className="px-5 py-3 text-right">
                  {editingId === entry.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        id="editPrice"
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-24 text-right"
                      />
                      <Button size="sm" onClick={() => handleUpdate(entry.id)}>Kaydet</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>İptal</Button>
                    </div>
                  ) : (
                    <span className="font-semibold text-gray-900">{formatPrice(entry.price)}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => { setEditingId(entry.id); setEditPrice(String(entry.price)); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 text-gray-400 hover:text-ena-primary transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">Fiyat listesi bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
