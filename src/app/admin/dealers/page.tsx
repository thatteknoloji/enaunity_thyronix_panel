"use client";

import { Fragment } from "react";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, Plus, Search, Check, X, Pencil, Trash2, ChevronDown, KeyRound } from "lucide-react";
import { DealerCredentialsPanel } from "@/components/admin/DealerCredentialsPanel";

interface DealerGroup { id: string; name: string; discountRate: number; creditLimit: number; allowNegativeBalance: boolean; paymentDays: number; }

interface Dealer {
  id: string; name: string; title: string; email: string; phone: string;
  company: string; website: string; location: string; companySize: string; markets: string;
  discountRate: number; group: string; creditLimit: number; openingBalance: number; balance: number;
  allowNegative: boolean; taxNumber: string; taxOffice: string;
  billingAddress: string; shippingAddress: string;
  status: string; createdAt: string; _count: { orders: number };
}

const FORM_DEFAULTS = {
  name: "", title: "", email: "", phone: "", company: "", website: "", location: "",
  companySize: "", markets: "", discountRate: "0", creditLimit: "0", group: "bronze",
  openingBalance: "0", balance: "0", allowNegative: false,
  taxNumber: "", taxOffice: "", billingAddress: "", shippingAddress: "",
  loginPassword: "",
};

const FIELD = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none";

export default function AdminDealersPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [groups, setGroups] = useState<DealerGroup[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Dealer | null>(null);
  const [form, setForm] = useState({ ...FORM_DEFAULTS });
  const [submitting, setSubmitting] = useState(false);

  const fetchDealers = useCallback(() => {
    fetch("/api/admin/dealers").then((r) => r.json()).then((d) => setDealers(d.data || []));
  }, []);

  const fetchGroups = useCallback(() => {
    fetch("/api/admin/dealer-groups").then((r) => r.json()).then((d) => setGroups(d.data || []));
  }, []);

  useEffect(() => { fetchDealers(); fetchGroups(); }, [fetchDealers, fetchGroups]);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/dealers/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    const d = await res.json();
    if (d.success) {
      toast.success(status === "active" ? "Bayi aktifleştirildi" : "Bayi askıya alındı");
      fetchDealers();
    } else toast.error(d.error || "Durum güncellenemedi");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu bayi kalıcı olarak silinsin mi?")) return;
    const res = await fetch(`/api/admin/dealers/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) {
      toast.success("Bayi silindi");
      if (expanded === id) setExpanded(null);
      fetchDealers();
    } else toast.error(d.error || "Bayi silinemedi");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const body = {
      ...form,
      discountRate: parseFloat(form.discountRate) || 0,
      creditLimit: parseFloat(form.creditLimit) || 0,
      openingBalance: parseFloat(form.openingBalance) || 0,
      balance: parseFloat(form.balance) || 0,
    };

    let res: Response;
    if (editing) {
      const { loginPassword: _pw, ...editBody } = body;
      res = await fetch(`/api/admin/dealers/${editing.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editBody),
      });
    } else {
      res = await fetch("/api/admin/dealers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    }
    const d = await res.json();
    setSubmitting(false);
    if (!d.success) {
      toast.error(d.error || "Kayıt başarısız");
      return;
    }
    toast.success(editing ? "Bayi güncellendi" : "Bayi eklendi");
    setShowForm(false); setEditing(null);
    setForm({ ...FORM_DEFAULTS });
    fetchDealers();
  };

  const startEdit = (dealer: Dealer) => {
    setEditing(dealer);
    setForm({
      name: dealer.name, title: dealer.title, email: dealer.email, phone: dealer.phone,
      company: dealer.company, website: dealer.website, location: dealer.location,
      companySize: dealer.companySize, markets: dealer.markets,
      discountRate: String(dealer.discountRate), creditLimit: String(dealer.creditLimit),
      group: dealer.group, openingBalance: String(dealer.openingBalance),
      balance: String(dealer.balance), allowNegative: dealer.allowNegative,
      taxNumber: dealer.taxNumber || "", taxOffice: dealer.taxOffice || "",
      billingAddress: dealer.billingAddress || "", shippingAddress: dealer.shippingAddress || "",
      loginPassword: "",
    });
    setShowForm(true);
  };

  const filtered = dealers.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.company.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-w-0 w-full max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bayiler</h1>
          <p className="text-sm text-gray-500 mt-1">Toplam {dealers.length} bayi</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ ...FORM_DEFAULTS }); setShowForm(!showForm); }} className="gap-1.5 shadow-sm">
          <Plus size={15} /> {showForm ? "İptal" : "Yeni Bayi"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">{editing ? "Bayi Düzenle" : "Yeni Bayi Ekle"}</h2>
          <p className="text-xs text-gray-400 mb-4">Fatura ve kargo bilgilerini de buradan girebilirsin</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Temel Bilgiler */}
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-3 tracking-wider">Temel Bilgiler</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FIELD label="Ad Soyad *"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></FIELD>
                <FIELD label="E-posta *"><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></FIELD>
                <FIELD label="Telefon"><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FIELD>
                <FIELD label="Ünvan"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FIELD>
                <FIELD label="Şirket *"><input className={inputClass} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required /></FIELD>
                <FIELD label="Website"><input className={inputClass} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></FIELD>
                <FIELD label="Lokasyon"><input className={inputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></FIELD>
                <FIELD label="Şirket Büyüklüğü"><input className={inputClass} value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })} /></FIELD>
                <FIELD label="Pazarlar"><input className={inputClass} value={form.markets} onChange={(e) => setForm({ ...form, markets: e.target.value })} /></FIELD>
              </div>
            </div>

            {/* Fatura Bilgileri */}
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-3 tracking-wider">Fatura Bilgileri</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FIELD label="Vergi No"><input className={inputClass} value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} /></FIELD>
                <FIELD label="Vergi Dairesi"><input className={inputClass} value={form.taxOffice} onChange={(e) => setForm({ ...form, taxOffice: e.target.value })} /></FIELD>
                <div className="md:col-span-2">
                  <FIELD label="Fatura Adresi"><textarea className={inputClass} rows={2} value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} /></FIELD>
                </div>
              </div>
            </div>

            {/* Kargo Bilgileri */}
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-3 tracking-wider">Kargo Bilgileri</p>
              <div className="md:col-span-2">
                <FIELD label="Kargo / Teslimat Adresi"><textarea className={inputClass} rows={2} value={form.shippingAddress} onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })} /></FIELD>
              </div>
            </div>

            {/* Finansal Ayarlar */}
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-3 tracking-wider">Finansal & Grup Ayarları</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FIELD label="Bayi Grubu">
                  <select className={inputClass} value={form.group} onChange={(e) => {
                    const g = groups.find((x) => x.name === e.target.value);
                    setForm({ ...form, group: e.target.value,
                      allowNegative: g?.allowNegativeBalance || false,
                      creditLimit: g?.creditLimit ? String(g.creditLimit) : form.creditLimit,
                      discountRate: g?.discountRate ? String(g.discountRate) : form.discountRate,
                    });
                  }}>
                    {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
                    {groups.length === 0 && <>
                      <option value="bronze">Bronze</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                    </>}
                  </select>
                </FIELD>
                <FIELD label="İndirim Oranı (%)"><input type="number" step="0.1" min="0" max="100" className={inputClass} value={form.discountRate} onChange={(e) => setForm({ ...form, discountRate: e.target.value })} /></FIELD>
                <FIELD label="Açılış Bakiyesi (₺)"><input type="number" step="1" className={inputClass} value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} /></FIELD>
                <FIELD label="Güncel Bakiye (₺)"><input type="number" step="1" className={inputClass} value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></FIELD>
                <FIELD label="Kredi Limiti (₺)"><input type="number" step="1" min="0" className={inputClass} value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} /></FIELD>
                <FIELD label="Eksi Bakiye">
                  <button type="button" onClick={() => setForm({ ...form, allowNegative: !form.allowNegative })}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors text-left ${form.allowNegative ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                    {form.allowNegative ? "✓ Eksi Bakiyeye İzin Ver" : "✗ Eksi Bakiye Kapalı"}
                  </button>
                </FIELD>
              </div>
            </div>

            {/* Giriş Hesabı */}
            {!editing && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 mb-3 tracking-wider">Giriş Hesabı</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FIELD label="Giriş Şifresi (opsiyonel)">
                    <input
                      type="password"
                      className={inputClass}
                      placeholder="Min 6 karakter — bayi paneline giriş için"
                      value={form.loginPassword}
                      onChange={(e) => setForm({ ...form, loginPassword: e.target.value })}
                      minLength={6}
                    />
                  </FIELD>
                </div>
                <p className="text-xs text-gray-400 mt-1">Şifre girersen e-posta ile bayi giriş hesabı otomatik oluşturulur. Şifre değişikliği için listeden Hesap panelini kullan.</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>{submitting ? "Kaydediliyor..." : editing ? "Güncelle" : "Ekle"}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>İptal</Button>
            </div>
          </form>
        </div>
      )}

      <div className="relative mb-4 max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input placeholder="Bayi ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <Store size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">Bayi bulunamadı</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3.5 text-left font-semibold text-gray-600">Bayi</th>
                <th className="px-4 py-3.5 text-left font-semibold text-gray-600">İletişim</th>
                <th className="px-4 py-3.5 text-left font-semibold text-gray-600">Grup</th>
                <th className="px-4 py-3.5 text-left font-semibold text-gray-600">Bakiye</th>
                <th className="px-4 py-3.5 text-left font-semibold text-gray-600">Kredi</th>
                <th className="px-4 py-3.5 text-left font-semibold text-gray-600">Fatura</th>
                <th className="px-4 py-3.5 text-left font-semibold text-gray-600">Durum</th>
                <th className="px-4 py-3.5 text-right font-semibold text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((dealer) => (
                <Fragment key={dealer.id}>
                <tr className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <button type="button" onClick={() => setExpanded(expanded === dealer.id ? null : dealer.id)} className="p-1 rounded hover:bg-gray-100">
                        <ChevronDown size={14} className={`transition-transform ${expanded === dealer.id ? "rotate-180" : ""}`} />
                      </button>
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {dealer.company.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{dealer.name}</p>
                        <p className="text-xs text-gray-500 truncate">{dealer.company}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><p className="text-gray-700 text-xs">{dealer.email}</p><p className="text-xs text-gray-400">{dealer.phone}</p></td>
                  <td className="px-4 py-3"><span className="uppercase font-medium text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{dealer.group}</span></td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${dealer.balance < 0 ? "text-ena-primary" : "text-gray-900"}`}>
                      {dealer.balance.toLocaleString("tr-TR")} ₺
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {dealer.creditLimit > 0 ?
                      <span className="font-medium text-gray-700">{dealer.creditLimit.toLocaleString("tr-TR")} ₺</span> :
                      <span className="text-gray-400">—</span>}
                    {dealer.allowNegative && <span className="ml-1 text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded">açık hesap</span>}
                  </td>
                  <td className="px-4 py-3">
                    {dealer.taxNumber ?
                      <span className="text-xs text-gray-500">{dealer.taxNumber}</span> :
                      <span className="text-xs text-gray-400 italic">bilgi yok</span>}
                  </td>
                  <td className="px-4 py-3">
                    {dealer.status === "active" ? <Badge variant="success">Aktif</Badge> : <Badge variant="danger">Pasif</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(expanded === dealer.id ? null : dealer.id)}
                        className={expanded === dealer.id ? "text-purple-700 bg-purple-50" : "text-purple-600 hover:text-purple-700 hover:bg-purple-50"}
                        title="Hesap & Şifre Yönetimi"
                      >
                        <KeyRound size={14} />
                        <span className="ml-1 hidden sm:inline text-xs">Hesap</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(dealer)} className="text-gray-500" title="Düzenle"><Pencil size={14} /></Button>
                      {dealer.status === "active" ? (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus(dealer.id, "suspended")} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"><X size={14} /></Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus(dealer.id, "active")} className="text-green-600 hover:text-green-700 hover:bg-green-50"><Check size={14} /></Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(dealer.id)} className="text-gray-500 hover:text-ena-primary" title="Sil"><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
                {expanded === dealer.id && (
                  <tr key={`${dealer.id}-creds`}>
                    <td colSpan={8} className="px-4 pb-4 bg-gray-50/50">
                      <DealerCredentialsPanel dealerId={dealer.id} />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
