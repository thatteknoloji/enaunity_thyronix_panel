"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Save } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { EcosystemShowcaseSection } from "@/components/ecosystem/EcosystemShowcaseSection";
import { AdminFormField } from "@/components/admin/AdminFormField";
import type { EcosystemShowcaseSettingsDTO } from "@/lib/ecosystem/section-settings";
import { DEFAULT_ECOSYSTEM_SECTION } from "@/lib/ecosystem/section-settings";
import toast from "react-hot-toast";

export default function EcosystemSectionSettingsPage() {
  const [form, setForm] = useState<EcosystemShowcaseSettingsDTO>({
    id: "default",
    ...DEFAULT_ECOSYSTEM_SECTION,
    updatedAt: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    fetch("/api/ecosystem/settings")
      .then((r) => r.json())
      .then((d) => { if (d.success) setForm(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<EcosystemShowcaseSettingsDTO>) =>
    setForm((p) => ({ ...p, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/ecosystem/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Bölüm ayarları kaydedildi");
        setForm(d.data);
      } else toast.error(d.error || "Kaydedilemedi");
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Yükleniyor...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={toAdminUrl("/admin/ecosystem")} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bölüm Ayarları</h1>
            <p className="text-sm text-gray-500">Ana sayfadaki Ekosistem Vitrini başlık, düzen ve görünüm</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="px-3 py-2 text-sm border rounded-lg flex items-center gap-1 hover:bg-gray-50"
          >
            <Eye size={14} /> {preview ? "Formu Göster" : "Önizleme"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg flex items-center gap-1 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {preview ? (
        <div className="rounded-xl border overflow-hidden">
          <EcosystemShowcaseSection settingsOverride={form} preview />
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
            Bölüm ana sayfada görünsün
          </label>

          <div className="grid md:grid-cols-2 gap-4">
            <AdminFormField label="Rozet Metni" value={form.badgeText} onChange={(v) => update({ badgeText: v })} />
            <AdminFormField label="Anchor ID (#)" value={form.anchorId} onChange={(v) => update({ anchorId: v })} />
            <div className="md:col-span-2">
              <AdminFormField label="Ana Başlık" value={form.title} onChange={(v) => update({ title: v })} />
            </div>
            <div className="md:col-span-2">
              <AdminFormField label="Açıklama" value={form.description} onChange={(v) => update({ description: v })} multiline />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Kolon Sayısı</label>
              <select
                className="admin-input"
                value={form.columns}
                onChange={(e) => update({ columns: parseInt(e.target.value) })}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n} kolon</option>
                ))}
              </select>
            </div>
            <AdminFormField label="Üst Boşluk (py-)" value={form.paddingTop} onChange={(v) => update({ paddingTop: v })} />
            <AdminFormField label="Alt Boşluk (py-)" value={form.paddingBottom} onChange={(v) => update({ paddingBottom: v })} />
            <AdminFormField label="Arka Plan Rengi 1" type="color" value={form.bgPrimaryColor} onChange={(v) => update({ bgPrimaryColor: v })} />
            <AdminFormField label="Arka Plan Rengi 2" type="color" value={form.bgSecondaryColor} onChange={(v) => update({ bgSecondaryColor: v })} />
          </div>
        </div>
      )}
    </div>
  );
}
