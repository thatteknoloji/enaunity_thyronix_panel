"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import RichTextEditor from "@/components/ui/rich-text-editor";
import {
  PAGE_TEMPLATE_HINTS,
  PAGE_TEMPLATE_LABELS,
  PAGE_TEMPLATES,
  type PageTemplate,
} from "@/lib/pages/types";

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    template: "default" as PageTemplate,
    active: true,
    order: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch("/api/admin/pages")
      .then((r) => r.json())
      .then((d) => {
        const page = (d.data || []).find((p: { id: string }) => p.id === id);
        if (page) {
          setForm({
            title: page.title,
            slug: page.slug,
            content: page.content,
            template: page.template || "default",
            active: page.active,
            order: page.order,
          });
        }
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/admin/pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Sayfa güncellendi");
      router.push(toAdminUrl("/admin/pages"));
    } else {
      const err = await res.json();
      toast.error(err.error || "Hata");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-96 rounded bg-gray-200" />
      </div>
    );
  }

  const ic = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none";

  return (
    <div className="max-w-4xl">
      <Link href={toAdminUrl("/admin/pages")} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={14} /> Sayfalara Dön
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{form.title || "Sayfa Düzenle"}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Başlık</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={ic} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Slug (URL)</label>
              <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={`${ic} font-mono`} />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Sayfa Şablonu</label>
            <select
              value={form.template}
              onChange={(e) => setForm({ ...form, template: e.target.value as PageTemplate })}
              className={ic}
            >
              {PAGE_TEMPLATES.map((t) => (
                <option key={t} value={t}>{PAGE_TEMPLATE_LABELS[t]}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">{PAGE_TEMPLATE_HINTS[form.template]}</p>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => setForm({ ...form, active: !form.active })}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                form.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"
              }`}
            >
              {form.active ? <Eye size={12} /> : <EyeOff size={12} />}
              {form.active ? "Yayında" : "Taslak"}
            </button>
            <span className="text-xs text-gray-400">
              Sayfa URL:{" "}
              <a href={`/${form.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">
                /{form.slug}
              </a>
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">İçerik</label>
            {form.template === "faq" ? (
              <p className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                SSS formatı: Giriş için H2/H3 kullanın. Her soru <strong>H3</strong>, cevap hemen altında paragraf veya liste olsun.
              </p>
            ) : null}
            {form.template === "contact" ? (
              <p className="mb-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                İletişim bilgileri (e-posta, telefon, adres) <Link href={toAdminUrl("/admin/footer-settings")} className="underline">Footer Ayarları</Link>ndan gelir. Buraya yalnızca üst açıklama metnini yazın. Form alanları sabittir.
              </p>
            ) : null}
            <RichTextEditor content={form.content} onChange={(html) => setForm({ ...form, content: html })} />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <Link href={toAdminUrl("/admin/pages")}>
            <button type="button" className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              İptal
            </button>
          </Link>
        </div>
      </form>
    </div>
  );
}
