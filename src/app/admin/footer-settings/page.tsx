"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Save, ArrowLeft } from "lucide-react";
import RichTextEditor from "@/components/ui/rich-text-editor";
import toast from "react-hot-toast";

const DEFAULTS = {
  about_text: "İşletmeniz için toptan çözümler. Binlerce ürün, kurumsal fiyatlar.",
  instagram: "",
  twitter: "",
  linkedin: "",
  youtube: "",
  contact_email: "",
  contact_phone: "",
  address: "",
};

export default function FooterSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/footer-settings").then(r => r.json()).then(d => {
      if (d.success) setSettings({ ...DEFAULTS, ...d.data });
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/footer-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    toast.success(res.ok ? "Kaydedildi" : "Hata");
    setSaving(false);
  };

  const update = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  const fields = [
    { key: "about_text", label: "Hakkımızda Metni", type: "richtext" },
    { key: "instagram", label: "Instagram URL" },
    { key: "twitter", label: "X (Twitter) URL" },
    { key: "linkedin", label: "LinkedIn URL" },
    { key: "youtube", label: "YouTube URL" },
    { key: "contact_email", label: "İletişim E-posta" },
    { key: "contact_phone", label: "İletişim Telefon" },
    { key: "address", label: "Adres", type: "textarea" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div><h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Footer Ayarları</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Alt bilgi (footer) içeriğini düzenle</p></div>
        <div className="ml-auto"><Button size="sm" onClick={handleSave} disabled={saving}><Save size={14} className="mr-1" />{saving ? "Kaydediliyor..." : "Kaydet"}</Button></div>
      </div>

      {loading ? <p className="text-gray-400">Yükleniyor...</p> : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {fields.map(f => {
              if (f.type === "richtext") {
                return (
                  <div key={f.key} className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1.5">{f.label}</label>
                    <div className="dark:invert-[0.9] dark:hue-rotate-180">
                      <RichTextEditor
                        content={settings[f.key] || ""}
                        onChange={val => update(f.key, val)}
                        minHeight={200}
                      />
                    </div>
                  </div>
                );
              }
              return (
                <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1.5">{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" rows={3}
                      value={settings[f.key] || ""} onChange={e => update(f.key, e.target.value)} />
                  ) : (
                    <input className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      value={settings[f.key] || ""} onChange={e => update(f.key, e.target.value)} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button size="sm" onClick={handleSave} disabled={saving}><Save size={14} className="mr-1" />{saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
