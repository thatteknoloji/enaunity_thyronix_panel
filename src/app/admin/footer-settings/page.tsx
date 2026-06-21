"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Save, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { DEFAULT_FOOTER_INTRO } from "@/lib/footer-intro";

const DEFAULTS = {
  about_intro: DEFAULT_FOOTER_INTRO,
  instagram: "",
  twitter: "",
  linkedin: "",
  youtube: "",
  contact_email: "",
  contact_phone: "",
  address: "",
};

const INTRO_MAX = 280;

export default function FooterSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/footer-settings").then(r => r.json()).then(d => {
      if (d.success) {
        const data = { ...DEFAULTS, ...d.data };
        if (!data.about_intro?.trim() && data.about_text) {
          data.about_intro = data.about_text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, INTRO_MAX);
        }
        setSettings(data);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...settings, about_intro: (settings.about_intro || "").slice(0, INTRO_MAX) };
    const res = await fetch("/api/admin/footer-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    toast.success(res.ok ? "Kaydedildi" : "Hata");
    setSaving(false);
  };

  const update = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  const fields = [
    { key: "instagram", label: "Instagram URL" },
    { key: "twitter", label: "X (Twitter) URL" },
    { key: "linkedin", label: "LinkedIn URL" },
    { key: "youtube", label: "YouTube URL" },
    { key: "contact_email", label: "İletişim E-posta" },
    { key: "contact_phone", label: "İletişim Telefon" },
    { key: "address", label: "Adres", type: "textarea" as const },
  ];

  const introLen = (settings.about_intro || "").length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href={toAdminUrl("/admin")} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div><h1 className="text-3xl font-bold text-gray-900">Footer Ayarları</h1><p className="mt-1 text-sm text-gray-500">Alt bilgi (footer) içeriğini düzenle</p></div>
        <div className="ml-auto"><Button size="sm" onClick={handleSave} disabled={saving}><Save size={14} className="mr-1" />{saving ? "Kaydediliyor..." : "Kaydet"}</Button></div>
      </div>

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-medium">Footer altı hukuki şerit</p>
        <p className="mt-1 text-blue-800/90 text-xs leading-relaxed">
          Ödeme ve güvenlik rozetleri (Visa, SSL vb.) için{" "}
          <Link href={toAdminUrl("/admin/footer-legal-strip")} className="underline font-medium">
            Footer Hukuki Şerit
          </Link>
          {" "}bölümünü kullanın.
        </p>
      </div>

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-medium">İletişim sayfası</p>
        <p className="mt-1 text-blue-800/90 text-xs leading-relaxed">
          E-posta, telefon ve adres kartları buradan gelir. Üst metin için{" "}
          <Link href={toAdminUrl("/admin/pages")} className="underline font-medium">Sayfalar → İletişim</Link>.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">Hakkımızda sayfası</p>
        <p className="mt-1 text-amber-900/90 text-xs leading-relaxed">
          Footer&apos;da yalnızca kısa tanıtım metni gösterilir (en fazla {INTRO_MAX} karakter).
          Uzun kurumsal metin, Dropshipping / XML Bayilik / Stoksuz E-Ticaret içeriği için{" "}
          <Link href={toAdminUrl("/admin/pages")} className="underline font-medium">Sayfalar → Hakkımızda</Link>
          {" "}bölümünü düzenleyin.
        </p>
      </div>

      {loading ? <p className="text-gray-400">Yükleniyor...</p> : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
              Footer Kısa Tanıtım
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white text-gray-900"
              rows={3}
              maxLength={INTRO_MAX}
              value={settings.about_intro || ""}
              onChange={(e) => update("about_intro", e.target.value)}
              placeholder={DEFAULT_FOOTER_INTRO}
            />
            <p className="mt-1.5 text-xs text-gray-400">{introLen}/{INTRO_MAX} karakter — footer&apos;da en fazla 4 satır gösterilir.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {fields.map(f => (
              <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white text-gray-900" rows={3}
                    value={settings[f.key] || ""} onChange={e => update(f.key, e.target.value)} />
                ) : (
                  <input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white text-gray-900"
                    value={settings[f.key] || ""} onChange={e => update(f.key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Button size="sm" onClick={handleSave} disabled={saving}><Save size={14} className="mr-1" />{saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
