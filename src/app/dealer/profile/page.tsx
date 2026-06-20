"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Building2, Mail, Phone, Globe, MapPin, Users, Tag, CreditCard, Wallet, ReceiptText, Truck, Save, Pencil, CalendarClock } from "lucide-react";
import toast from "react-hot-toast";

interface DP {
  id: string; name: string; title: string; email: string; phone: string;
  company: string; website: string; location: string; companySize: string; markets: string;
  discountRate: number; creditLimit: number; openingBalance: number; balance: number;
  allowNegative: boolean; taxNumber: string; taxOffice: string;
  billingAddress: string; shippingAddress: string; status: string; group: string; createdAt: string;
  dealerGroup?: { paymentDays: number; allowNegativeBalance: boolean; creditLimit: number; discountRate: number } | null;
  subscriptions?: {
    moduleKey: string;
    moduleLabel: string;
    planKey: string;
    status: string;
    billingPeriod: string;
    endsAt: string | null;
    daysRemaining: number | null;
    lifecycleStage: string;
    isExpiringSoon: boolean;
    isExpired: boolean;
  }[];
}

export default function DealerProfilePage() {
  const [profile, setProfile] = useState<DP | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ taxNumber: "", taxOffice: "", billingAddress: "", shippingAddress: "", phone: "", website: "", location: "" });
  const [saving, setSaving] = useState(false);

  const fetchProfile = () => {
    fetch("/api/dealer/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProfile(d.data);
          setForm({
            taxNumber: d.data.taxNumber || "", taxOffice: d.data.taxOffice || "",
            billingAddress: d.data.billingAddress || "", shippingAddress: d.data.shippingAddress || "",
            phone: d.data.phone || "", website: d.data.website || "", location: d.data.location || "",
          });
        }
      }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/dealer/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Bilgiler güncellendi");
      setEditing(false);
      fetchProfile();
    } else {
      toast.error("Güncelleme başarısız");
    }
    setSaving(false);
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-ena-card/50" /><div className="h-96 rounded bg-ena-card/50" /></div>;
  if (!profile) return <p className="text-ena-light/50">Profil bilgisi yüklenemedi.</p>;

  const fields = [
    { icon: Building2, label: "Firma", value: profile.company },
    { icon: User, label: "Yetkili", value: `${profile.name} ${profile.title ? `(${profile.title})` : ""}` },
    { icon: Mail, label: "E-posta", value: profile.email },
    { icon: Phone, label: "Telefon", value: profile.phone },
    { icon: Globe, label: "Website", value: profile.website || "-" },
    { icon: MapPin, label: "Lokasyon", value: profile.location },
    { icon: Users, label: "Şirket Büyüklüğü", value: profile.companySize || "-" },
    { icon: Tag, label: "Hedef Pazarlar", value: profile.markets || "-" },
    { icon: CreditCard, label: "Kredi Limiti", value: profile.creditLimit > 0 ? `${profile.creditLimit.toLocaleString("tr-TR")} ₺` : "Tanımlanmamış" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ena-text mb-6">Profilim</h1>

      {/* Bakiye Kartı */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={18} className="text-amber-600" />
            <span className="text-xs font-semibold uppercase text-ena-light/50">Bakiye</span>
          </div>
          <p className={`text-2xl font-bold ${profile.balance < 0 ? "text-ena-primary" : "text-ena-text"}`}>
            {profile.balance.toLocaleString("tr-TR")} ₺
          </p>
          {profile.allowNegative && <p className="text-[10px] text-amber-600 mt-0.5">Açık hesap aktif</p>}
        </div>
        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={18} className="text-purple-600" />
            <span className="text-xs font-semibold uppercase text-ena-light/50">Kredi Limiti</span>
          </div>
          <p className="text-2xl font-bold text-ena-text">
            {profile.creditLimit > 0 ? `${profile.creditLimit.toLocaleString("tr-TR")} ₺` : "—"}
          </p>
          {profile.dealerGroup?.paymentDays ? <p className="text-[10px] text-ena-light/40 mt-0.5">{profile.dealerGroup.paymentDays} gün vadeli</p> : null}
        </div>
        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Tag size={18} className="text-emerald-600" />
            <span className="text-xs font-semibold uppercase text-ena-light/50">İndirim</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">%{profile.discountRate}</p>
          <p className="text-[10px] text-ena-light/40 mt-0.5 capitalize">{profile.group} grup</p>
        </div>
      </div>

      {(profile.subscriptions?.length ?? 0) > 0 && (
        <section id="subscriptions" className="mb-6">
          <h2 className="text-lg font-semibold text-ena-text mb-3 flex items-center gap-2">
            <CalendarClock size={18} className="text-ena-primary" /> Modül Abonelikleri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.subscriptions!.map((sub) => {
              const days = sub.daysRemaining;
              const urgent = days !== null && days >= 0 && days <= 15;
              const expired = sub.isExpired || (days !== null && days < 0);
              return (
                <div
                  key={sub.moduleKey}
                  className={`rounded-xl border p-4 ${
                    expired ? "border-red-300 bg-red-500/10" : urgent ? "border-amber-300 bg-amber-500/10" : "border-ena-border bg-ena-card/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ena-text">{sub.moduleLabel}</p>
                      <p className="text-xs text-ena-light/50 mt-0.5">{sub.planKey || "—"} · {sub.billingPeriod === "yearly" ? "Yıllık" : "Aylık"}</p>
                    </div>
                    <Badge variant={expired ? "danger" : urgent ? "warning" : "success"}>
                      {sub.status}
                    </Badge>
                  </div>
                  {sub.endsAt && (
                    <p className="text-sm mt-3 text-ena-light/80">
                      Bitiş: <strong>{formatDate(sub.endsAt)}</strong>
                    </p>
                  )}
                  {days !== null && !expired && (
                    <p className={`text-lg font-bold mt-1 ${urgent ? "text-amber-500" : "text-emerald-500"}`}>
                      {days === 0 ? "Bugün son gün" : days === 1 ? "Yarın sona eriyor" : `${days} gün kaldı`}
                    </p>
                  )}
                  {expired && (
                    <p className="text-sm text-red-400 mt-2">
                      Süre doldu · {sub.lifecycleStage === "passive" ? "Pasif" : sub.lifecycleStage === "blocked" ? "Engelli" : sub.lifecycleStage === "purged" ? "Veriler silindi" : "Yenileme gerekli"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Firma Bilgileri */}
        <div className="lg:col-span-2 rounded-xl border border-ena-border bg-ena-card/30 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-ena-text mb-4">Firma Bilgileri</h2>
          <dl className="space-y-4">
            {fields.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-purple-600" />
                </div>
                <div>
                  <dt className="text-xs text-ena-light/50">{label}</dt>
                  <dd className="text-sm font-medium text-ena-text">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* Durum Kartı */}
        <div className="space-y-4">
          <div className="rounded-xl border border-ena-border bg-ena-card/30 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-ena-text mb-4">Hesap Durumu</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-ena-light/50">Durum</span>
                <Badge variant={profile.status === "active" ? "success" : "danger"}>
                  {profile.status === "active" ? "Aktif" : "Pasif"}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ena-light/50">Kayıt Tarihi</span>
                <span className="font-medium">{formatDate(profile.createdAt)}</span>
              </div>
              {profile.creditLimit > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-ena-light/50">Kalan Kredi</span>
                  <span className={`font-medium ${profile.balance < 0 ? "text-ena-primary" : "text-ena-text"}`}>
                    {Math.max(profile.creditLimit + profile.balance, 0).toLocaleString("tr-TR")} ₺
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fatura & Kargo Bilgileri */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ena-text">Fatura &amp; Kargo Bilgileri</h2>
          {!editing ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil size={14} className="mr-1" /> Düzenle
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save size={14} className="mr-1" /> {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>İptal</Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fatura */}
          <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ReceiptText size={16} className="text-ena-light/50" />
              <h3 className="text-sm font-semibold text-ena-text">Fatura Bilgileri</h3>
            </div>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-ena-light/50 mb-1">Vergi No</label>
                  <input className="w-full rounded-lg border border-ena-border px-3 py-2 text-sm focus:border-ena-border focus:outline-none" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} placeholder="Vergi numarası" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ena-light/50 mb-1">Vergi Dairesi</label>
                  <input className="w-full rounded-lg border border-ena-border px-3 py-2 text-sm focus:border-ena-border focus:outline-none" value={form.taxOffice} onChange={(e) => setForm({ ...form, taxOffice: e.target.value })} placeholder="Vergi dairesi" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ena-light/50 mb-1">Fatura Adresi</label>
                  <textarea className="w-full rounded-lg border border-ena-border px-3 py-2 text-sm focus:border-ena-border focus:outline-none" rows={2} value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} placeholder="Fatura adresi" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ena-light/50 mb-1">Telefon</label>
                  <input className="w-full rounded-lg border border-ena-border px-3 py-2 text-sm focus:border-ena-border focus:outline-none" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-ena-light/50">Vergi No</dt><dd className="font-medium text-ena-text">{profile.taxNumber || "—"}</dd></div>
                <div><dt className="text-xs text-ena-light/50">Vergi Dairesi</dt><dd className="font-medium text-ena-text">{profile.taxOffice || "—"}</dd></div>
                <div><dt className="text-xs text-ena-light/50">Fatura Adresi</dt><dd className="font-medium text-ena-text whitespace-pre-line">{profile.billingAddress || "—"}</dd></div>
                <div><dt className="text-xs text-ena-light/50">Telefon</dt><dd className="font-medium text-ena-text">{profile.phone || "—"}</dd></div>
              </dl>
            )}
          </div>

          {/* Kargo */}
          <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={16} className="text-ena-light/50" />
              <h3 className="text-sm font-semibold text-ena-text">Kargo &amp; Teslimat</h3>
            </div>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-ena-light/50 mb-1">Teslimat Adresi</label>
                  <textarea className="w-full rounded-lg border border-ena-border px-3 py-2 text-sm focus:border-ena-border focus:outline-none" rows={3} value={form.shippingAddress} onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })} placeholder="Varsayılan teslimat adresi" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ena-light/50 mb-1">Website</label>
                  <input className="w-full rounded-lg border border-ena-border px-3 py-2 text-sm focus:border-ena-border focus:outline-none" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ena-light/50 mb-1">Lokasyon</label>
                  <input className="w-full rounded-lg border border-ena-border px-3 py-2 text-sm focus:border-ena-border focus:outline-none" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-ena-light/50">Teslimat Adresi</dt><dd className="font-medium text-ena-text whitespace-pre-line">{profile.shippingAddress || "—"}</dd></div>
                <div><dt className="text-xs text-ena-light/50">Website</dt><dd className="font-medium text-ena-text">{profile.website || "—"}</dd></div>
                <div><dt className="text-xs text-ena-light/50">Lokasyon</dt><dd className="font-medium text-ena-text">{profile.location || "—"}</dd></div>
              </dl>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
