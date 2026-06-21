"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Globe, ImageIcon, Save, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { toAdminUrl } from "@/lib/auth/admin-access";
import {
  DEFAULT_FAVICON,
  DEFAULT_META_DESCRIPTION,
  DEFAULT_SITE_TITLE,
} from "@/lib/site-settings/defaults";

type FormState = {
  faviconUrl: string;
  siteTitle: string;
  defaultMetaDescription: string;
  ogImageUrl: string;
  updatedAt: string;
};

const EMPTY: FormState = {
  faviconUrl: "",
  siteTitle: "",
  defaultMetaDescription: "",
  ogImageUrl: "",
  updatedAt: "",
};

export default function SiteSettingsPage() {
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);
  const [faviconPreview, setFaviconPreview] = useState<string>("");
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setForm({
            faviconUrl: d.data.faviconUrl || "",
            siteTitle: d.data.siteTitle || "",
            defaultMetaDescription: d.data.defaultMetaDescription || "",
            ogImageUrl: d.data.ogImageUrl || "",
            updatedAt: d.data.updatedAt || "",
          });
        }
        setLoading(false);
      });
  }, []);

  const displayFavicon = faviconPreview || form.faviconUrl || DEFAULT_FAVICON;
  const faviconWithVersion = form.faviconUrl && form.updatedAt
    ? `${form.faviconUrl}?v=${new Date(form.updatedAt).getTime()}`
    : displayFavicon;

  const update = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const uploadFile = async (file: File, kind: "favicon" | "og") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    const setUploading = kind === "favicon" ? setUploadingFavicon : setUploadingOg;
    setUploading(true);
    try {
      const r = await fetch("/api/admin/site-settings/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok || !d.success) {
        toast.error(d.error || "Yükleme başarısız");
        return;
      }
      if (kind === "favicon") {
        setFaviconPreview(d.data.url);
        update("faviconUrl", d.data.url);
      } else {
        update("ogImageUrl", d.data.url);
      }
      toast.success("Dosya yüklendi — kaydetmeyi unutmayın");
    } catch {
      toast.error("Yükleme hatası");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setForm((prev) => ({ ...prev, ...d.data }));
        setFaviconPreview("");
        toast.success("Site ayarları kaydedildi");
      } else {
        toast.error(d.error || "Kayıt hatası");
      }
    } catch {
      toast.error("Kayıt hatası");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <Link href={toAdminUrl("/admin")} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Ayarları</h1>
          <p className="mt-1 text-sm text-gray-500">Tarayıcı sekmesi favicon ve site başlığı</p>
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={handleSave} disabled={saving || loading}>
            <Save size={14} className="mr-1" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Yükleniyor...</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Globe size={18} className="text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Sekme & SEO</h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-600">Site Başlığı (Title)</label>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  value={form.siteTitle}
                  onChange={(e) => update("siteTitle", e.target.value)}
                  placeholder={DEFAULT_SITE_TITLE}
                />
                <p className="mt-1 text-xs text-gray-400">Boş bırakılırsa varsayılan: {DEFAULT_SITE_TITLE}</p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-600">Varsayılan Meta Açıklama</label>
                <textarea
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  rows={3}
                  value={form.defaultMetaDescription}
                  onChange={(e) => update("defaultMetaDescription", e.target.value)}
                  placeholder={DEFAULT_META_DESCRIPTION}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon size={18} className="text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Favicon</h2>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={faviconPreview || faviconWithVersion}
                  alt="Favicon önizleme"
                  className="max-h-full max-w-full object-contain"
                  width={48}
                  height={48}
                />
              </div>

              <div className="flex-1 space-y-3">
                <p className="text-sm text-gray-600">
                  Tarayıcı sekmesinde görünen küçük logo. .ico, .png, .svg veya .webp — en fazla 1 MB.
                </p>
                {form.faviconUrl && !faviconPreview && (
                  <p className="text-xs text-gray-400">Mevcut: {form.faviconUrl}</p>
                )}
                {faviconPreview && (
                  <p className="text-xs text-amber-700">Yeni yükleme önizlemesi — kaydetmeyi unutmayın.</p>
                )}
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept=".ico,.png,.svg,.webp,image/x-icon,image/png,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadFile(file, "favicon");
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingFavicon}
                  onClick={() => faviconInputRef.current?.click()}
                >
                  <Upload size={14} className="mr-1" />
                  {uploadingFavicon ? "Yükleniyor..." : "Favicon Yükle"}
                </Button>
                {form.faviconUrl && (
                  <button
                    type="button"
                    className="ml-2 text-xs text-red-600 hover:underline"
                    onClick={() => {
                      update("faviconUrl", "");
                      setFaviconPreview("");
                    }}
                  >
                    Faviconu kaldır (varsayılana dön)
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon size={18} className="text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Open Graph Görseli (opsiyonel)</h2>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {(form.ogImageUrl || uploadingOg) && (
                <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {form.ogImageUrl ? (
                    <Image src={form.ogImageUrl} alt="OG önizleme" fill className="object-cover" unoptimized />
                  ) : null}
                </div>
              )}
              <div className="flex-1 space-y-3">
                <p className="text-sm text-gray-600">Sosyal medyada paylaşımda kullanılacak görsel (önerilen 1200×630).</p>
                <input
                  ref={ogInputRef}
                  type="file"
                  accept=".png,.svg,.webp,image/png,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadFile(file, "og");
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingOg}
                  onClick={() => ogInputRef.current?.click()}
                >
                  <Upload size={14} className="mr-1" />
                  {uploadingOg ? "Yükleniyor..." : "OG Görseli Yükle"}
                </Button>
                {form.ogImageUrl && (
                  <button
                    type="button"
                    className="ml-2 text-xs text-red-600 hover:underline"
                    onClick={() => update("ogImageUrl", "")}
                  >
                    Görseli kaldır
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-medium">Önizleme</p>
            <p className="mt-1 text-xs leading-relaxed text-blue-800/90">
              Sekme başlığı: <strong>{form.siteTitle || DEFAULT_SITE_TITLE}</strong>
            </p>
          </div>

          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save size={14} className="mr-1" />
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </Button>
        </div>
      )}
    </div>
  );
}
