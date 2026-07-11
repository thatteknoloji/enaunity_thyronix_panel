"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Globe,
  ImageIcon,
  Palette,
  Plus,
  Save,
  Settings2,
  Trash2,
  Upload,
  Link2,
  Route,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { toAdminUrl } from "@/lib/auth/admin-access";
import {
  DEFAULT_BRAND_PRIMARY,
  DEFAULT_FAVICON,
  DEFAULT_KEYWORDS,
  DEFAULT_LOCALE,
  DEFAULT_META_DESCRIPTION,
  DEFAULT_NOT_FOUND_BODY,
  DEFAULT_NOT_FOUND_FOOTER_NOTE,
  DEFAULT_NOT_FOUND_HINT,
  DEFAULT_NOT_FOUND_SEARCH_PLACEHOLDER,
  DEFAULT_NOT_FOUND_SUBTITLE,
  DEFAULT_NOT_FOUND_TITLE,
  DEFAULT_OG_SITE_NAME,
  DEFAULT_ORGANIZATION_NAME,
  DEFAULT_SITE_TITLE,
  DEFAULT_SITE_TITLE_TEMPLATE,
  DEFAULT_THEME_COLOR,
} from "@/lib/site-settings/defaults";
import type {
  NotFoundQuickLink,
  NotFoundRedirectRule,
} from "@/lib/site-settings/not-found";

type FormState = {
  faviconUrl: string;
  siteTitle: string;
  defaultMetaDescription: string;
  ogImageUrl: string;
  ogSiteName: string;
  titleTemplate: string;
  themeColor: string;
  brandPrimaryColor: string;
  defaultKeywords: string;
  appleTouchIconUrl: string;
  organizationName: string;
  supportEmail: string;
  robotsNoIndex: boolean;
  twitterHandle: string;
  locale: string;
  copyrightText: string;
  notFoundTitle: string;
  notFoundSubtitle: string;
  notFoundBody: string;
  notFoundHint: string;
  notFoundSearchPlaceholder: string;
  notFoundFooterNote: string;
  notFoundQuickLinksJson: string;
  notFoundRedirectRulesJson: string;
  updatedAt: string;
};

const EMPTY: FormState = {
  faviconUrl: "",
  siteTitle: "",
  defaultMetaDescription: "",
  ogImageUrl: "",
  ogSiteName: "",
  titleTemplate: "",
  themeColor: "",
  brandPrimaryColor: "",
  defaultKeywords: "",
  appleTouchIconUrl: "",
  organizationName: "",
  supportEmail: "",
  robotsNoIndex: false,
  twitterHandle: "",
  locale: "",
  copyrightText: "",
  notFoundTitle: "",
  notFoundSubtitle: "",
  notFoundBody: "",
  notFoundHint: "",
  notFoundSearchPlaceholder: "",
  notFoundFooterNote: "",
  notFoundQuickLinksJson: "",
  notFoundRedirectRulesJson: "",
  updatedAt: "",
};

type Tab = "genel" | "seo" | "teknik" | "notfound";

const DEFAULT_404_LINKS: NotFoundQuickLink[] = [
  { label: "Ana sayfa", href: "/", description: "Marka vitrinine dön" },
  { label: "Katalog", href: "/catalog", description: "Ürünleri tara" },
  { label: "Bayi paneli", href: "/dealer", description: "Sipariş akışına dön" },
  { label: "Ürünler", href: "/products", description: "Lisanslı içerikler" },
];

const DEFAULT_REDIRECT_RULES: NotFoundRedirectRule[] = [];

export default function SiteSettingsPage() {
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [tab, setTab] = useState<Tab>("genel");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"favicon" | "og" | "apple" | null>(null);
  const [faviconPreview, setFaviconPreview] = useState("");
  const [quickLinks, setQuickLinks] = useState<NotFoundQuickLink[]>(DEFAULT_404_LINKS);
  const [redirectRules, setRedirectRules] = useState<NotFoundRedirectRule[]>(DEFAULT_REDIRECT_RULES);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);
  const appleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const x = d.data;
          setForm({
            faviconUrl: x.faviconUrl || "",
            siteTitle: x.siteTitle || "",
            defaultMetaDescription: x.defaultMetaDescription || "",
            ogImageUrl: x.ogImageUrl || "",
            ogSiteName: x.ogSiteName || "",
            titleTemplate: x.titleTemplate || "",
            themeColor: x.themeColor || "",
            brandPrimaryColor: x.brandPrimaryColor || "",
            defaultKeywords: x.defaultKeywords || "",
            appleTouchIconUrl: x.appleTouchIconUrl || "",
            organizationName: x.organizationName || "",
            supportEmail: x.supportEmail || "",
            robotsNoIndex: !!x.robotsNoIndex,
            twitterHandle: x.twitterHandle || "",
            locale: x.locale || "",
            copyrightText: x.copyrightText || "",
            notFoundTitle: x.notFoundTitle || "",
            notFoundSubtitle: x.notFoundSubtitle || "",
            notFoundBody: x.notFoundBody || "",
            notFoundHint: x.notFoundHint || "",
            notFoundSearchPlaceholder: x.notFoundSearchPlaceholder || "",
            notFoundFooterNote: x.notFoundFooterNote || "",
            notFoundQuickLinksJson: x.notFoundQuickLinksJson || "[]",
            notFoundRedirectRulesJson: x.notFoundRedirectRulesJson || "[]",
            updatedAt: x.updatedAt || "",
          });
          try {
            const links = JSON.parse(x.notFoundQuickLinksJson || "[]") as NotFoundQuickLink[];
            setQuickLinks(Array.isArray(links) && links.length ? links : DEFAULT_404_LINKS);
          } catch {
            setQuickLinks(DEFAULT_404_LINKS);
          }
          try {
            const rules = JSON.parse(x.notFoundRedirectRulesJson || "[]") as NotFoundRedirectRule[];
            setRedirectRules(Array.isArray(rules) ? rules : DEFAULT_REDIRECT_RULES);
          } catch {
            setRedirectRules(DEFAULT_REDIRECT_RULES);
          }
        }
        setLoading(false);
      });
  }, []);

  const displayFavicon = faviconPreview || form.faviconUrl || DEFAULT_FAVICON;
  const faviconWithVersion =
    form.faviconUrl && form.updatedAt ? `${form.faviconUrl}?v=${new Date(form.updatedAt).getTime()}` : displayFavicon;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateQuickLink = (index: number, key: keyof NotFoundQuickLink, value: string) => {
    setQuickLinks((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };
  const updateRedirectRule = (
    index: number,
    key: keyof NotFoundRedirectRule,
    value: string | boolean | 301 | 302 | 307 | 308
  ) => {
    setRedirectRules((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (key === "active") return { ...item, active: Boolean(value) };
        if (key === "statusCode") return { ...item, statusCode: Number(value) as 301 | 302 | 307 | 308 };
        if (key === "matchType") return { ...item, matchType: String(value) as "exact" | "prefix" };
        if (key === "fromPath") return { ...item, fromPath: String(value) };
        if (key === "toPath") return { ...item, toPath: String(value) };
        if (key === "note") return { ...item, note: String(value) };
        return item;
      })
    );
  };

  const uploadFile = async (file: File, kind: "favicon" | "og" | "apple") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    setUploading(kind);
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
      } else if (kind === "og") {
        update("ogImageUrl", d.data.url);
      } else {
        update("appleTouchIconUrl", d.data.url);
      }
      toast.success("Dosya yüklendi — kaydetmeyi unutmayın");
    } catch {
      toast.error("Yükleme hatası");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          notFoundQuickLinksJson: JSON.stringify(quickLinks),
          notFoundRedirectRulesJson: JSON.stringify(redirectRules),
        }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setForm((prev) => ({ ...prev, ...d.data }));
        setFaviconPreview("");
        try {
          const parsedLinks = JSON.parse(d.data.notFoundQuickLinksJson || "[]") as NotFoundQuickLink[];
          setQuickLinks(Array.isArray(parsedLinks) ? parsedLinks : DEFAULT_404_LINKS);
        } catch {
          setQuickLinks(DEFAULT_404_LINKS);
        }
        try {
          const parsedRules = JSON.parse(d.data.notFoundRedirectRulesJson || "[]") as NotFoundRedirectRule[];
          setRedirectRules(Array.isArray(parsedRules) ? parsedRules : DEFAULT_REDIRECT_RULES);
        } catch {
          setRedirectRules(DEFAULT_REDIRECT_RULES);
        }
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "genel", label: "Genel", icon: <Globe size={14} /> },
    { id: "seo", label: "SEO & Marka", icon: <Palette size={14} /> },
    { id: "teknik", label: "Global & Teknik", icon: <Settings2 size={14} /> },
    { id: "notfound", label: "404 & Yönlendirme", icon: <ShieldAlert size={14} /> },
  ];

  const inputClass =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase text-gray-600";

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Link href={toAdminUrl("/admin")} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Ayarları</h1>
          <p className="mt-1 text-sm text-gray-500">Favicon, SEO, marka renkleri ve global meta</p>
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={handleSave} disabled={saving || loading}>
            <Save size={14} className="mr-1" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400">Yükleniyor...</p>
      ) : (
        <div className="space-y-6">
          {tab === "genel" && (
            <>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Sekme & Temel Bilgiler</h2>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Site Başlığı (Title)</label>
                    <input className={inputClass} value={form.siteTitle} onChange={(e) => update("siteTitle", e.target.value)} placeholder={DEFAULT_SITE_TITLE} />
                    <p className="mt-1 text-xs text-gray-400">Varsayılan: {DEFAULT_SITE_TITLE}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Varsayılan Meta Açıklama</label>
                    <textarea className={inputClass} rows={3} value={form.defaultMetaDescription} onChange={(e) => update("defaultMetaDescription", e.target.value)} placeholder={DEFAULT_META_DESCRIPTION} />
                  </div>
                  <div>
                    <label className={labelClass}>Kuruluş Adı</label>
                    <input className={inputClass} value={form.organizationName} onChange={(e) => update("organizationName", e.target.value)} placeholder={DEFAULT_ORGANIZATION_NAME} />
                  </div>
                  <div>
                    <label className={labelClass}>Destek E-postası</label>
                    <input type="email" className={inputClass} value={form.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} placeholder="destek@enaunity.com" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Copyright Metni (footer)</label>
                    <input className={inputClass} value={form.copyrightText} onChange={(e) => update("copyrightText", e.target.value)} placeholder="© 2026 Enaunity. Tüm hakları saklıdır." />
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
                    <img src={faviconPreview || faviconWithVersion} alt="Favicon" className="max-h-full max-w-full object-contain" width={48} height={48} />
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-sm text-gray-600">.ico, .png, .svg veya .webp — en fazla 1 MB.</p>
                    <input ref={faviconInputRef} type="file" accept=".ico,.png,.svg,.webp,image/x-icon,image/png,image/svg+xml,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f, "favicon"); e.target.value = ""; }} />
                    <Button type="button" variant="outline" size="sm" disabled={uploading === "favicon"} onClick={() => faviconInputRef.current?.click()}>
                      <Upload size={14} className="mr-1" />
                      {uploading === "favicon" ? "Yükleniyor..." : "Favicon Yükle"}
                    </Button>
                    {form.faviconUrl && (
                      <button type="button" className="ml-2 text-xs text-red-600 hover:underline" onClick={() => { update("faviconUrl", ""); setFaviconPreview(""); }}>Kaldır</button>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Apple Touch Icon</h2>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {(form.appleTouchIconUrl || uploading === "apple") && (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                      {form.appleTouchIconUrl ? <Image src={form.appleTouchIconUrl} alt="Apple icon" fill className="object-contain p-2" unoptimized /> : null}
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <p className="text-sm text-gray-600">iOS ana ekran ikonu (önerilen 180×180). Boş bırakılırsa favicon kullanılır.</p>
                    <input ref={appleInputRef} type="file" accept=".png,.webp,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f, "apple"); e.target.value = ""; }} />
                    <Button type="button" variant="outline" size="sm" disabled={uploading === "apple"} onClick={() => appleInputRef.current?.click()}>
                      <Upload size={14} className="mr-1" />
                      {uploading === "apple" ? "Yükleniyor..." : "Apple Icon Yükle"}
                    </Button>
                    {form.appleTouchIconUrl && (
                      <button type="button" className="ml-2 text-xs text-red-600 hover:underline" onClick={() => update("appleTouchIconUrl", "")}>Kaldır</button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "seo" && (
            <>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">SEO & Open Graph</h2>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>OG Site Adı</label>
                    <input className={inputClass} value={form.ogSiteName} onChange={(e) => update("ogSiteName", e.target.value)} placeholder={DEFAULT_OG_SITE_NAME} />
                  </div>
                  <div>
                    <label className={labelClass}>Title Şablonu</label>
                    <input className={inputClass} value={form.titleTemplate} onChange={(e) => update("titleTemplate", e.target.value)} placeholder={DEFAULT_SITE_TITLE_TEMPLATE} />
                    <p className="mt-1 text-xs text-gray-400">%s = sayfa başlığı</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Anahtar Kelimeler</label>
                    <textarea className={inputClass} rows={2} value={form.defaultKeywords} onChange={(e) => update("defaultKeywords", e.target.value)} placeholder={DEFAULT_KEYWORDS.join(", ")} />
                    <p className="mt-1 text-xs text-gray-400">Virgülle ayırın</p>
                  </div>
                  <div>
                    <label className={labelClass}>Twitter / X Kullanıcı Adı</label>
                    <div className="flex">
                      <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 px-2 text-sm text-gray-500">@</span>
                      <input className={`${inputClass} rounded-l-none`} value={form.twitterHandle} onChange={(e) => update("twitterHandle", e.target.value.replace(/^@/, ""))} placeholder="enaunity" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Locale</label>
                    <input className={inputClass} value={form.locale} onChange={(e) => update("locale", e.target.value)} placeholder={DEFAULT_LOCALE} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Marka Renkleri</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Tema Rengi (theme-color)</label>
                    <div className="flex gap-2">
                      <input type="color" value={form.themeColor || DEFAULT_THEME_COLOR} onChange={(e) => update("themeColor", e.target.value)} className="h-10 w-14 rounded border cursor-pointer" />
                      <input className={inputClass} value={form.themeColor} onChange={(e) => update("themeColor", e.target.value)} placeholder={DEFAULT_THEME_COLOR} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Marka Birincil Rengi</label>
                    <div className="flex gap-2">
                      <input type="color" value={form.brandPrimaryColor || DEFAULT_BRAND_PRIMARY} onChange={(e) => update("brandPrimaryColor", e.target.value)} className="h-10 w-14 rounded border cursor-pointer" />
                      <input className={inputClass} value={form.brandPrimaryColor} onChange={(e) => update("brandPrimaryColor", e.target.value)} placeholder={DEFAULT_BRAND_PRIMARY} />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">CSS --color-ena-primary olarak uygulanır</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Open Graph Görseli</h2>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {form.ogImageUrl && (
                    <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      <Image src={form.ogImageUrl} alt="OG" fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <p className="text-sm text-gray-600">Sosyal paylaşım görseli (önerilen 1200×630).</p>
                    <input ref={ogInputRef} type="file" accept=".png,.svg,.webp,image/png,image/svg+xml,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f, "og"); e.target.value = ""; }} />
                    <Button type="button" variant="outline" size="sm" disabled={uploading === "og"} onClick={() => ogInputRef.current?.click()}>
                      <Upload size={14} className="mr-1" />
                      {uploading === "og" ? "Yükleniyor..." : "OG Görseli Yükle"}
                    </Button>
                    {form.ogImageUrl && (
                      <button type="button" className="ml-2 text-xs text-red-600 hover:underline" onClick={() => update("ogImageUrl", "")}>Kaldır</button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "teknik" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Global & Teknik</h2>
              <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 cursor-pointer">
                <input type="checkbox" checked={form.robotsNoIndex} onChange={(e) => update("robotsNoIndex", e.target.checked)} className="mt-1" />
                <div>
                  <span className="font-medium text-amber-900">Arama motorlarında indexleme (noindex)</span>
                  <p className="mt-1 text-sm text-amber-800/80">Aktif edilirse tüm site robots meta ile indexlenmez. Staging/test ortamları için kullanın.</p>
                </div>
              </label>
              <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <p className="font-medium">Önizleme</p>
                <ul className="mt-2 space-y-1 text-xs text-blue-800/90">
                  <li>Sekme: <strong>{form.siteTitle || DEFAULT_SITE_TITLE}</strong></li>
                  <li>Alt sayfa: <strong>{(form.titleTemplate || DEFAULT_SITE_TITLE_TEMPLATE).replace("%s", "Katalog")}</strong></li>
                  <li>Lang: <strong>{(form.locale || DEFAULT_LOCALE).split("_")[0]}</strong></li>
                  <li>Theme: <strong>{form.themeColor || DEFAULT_THEME_COLOR}</strong></li>
                </ul>
              </div>
            </div>
          )}

          {tab === "notfound" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">404 sayfa metinleri</h2>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Başlık</label>
                    <input
                      className={inputClass}
                      value={form.notFoundTitle}
                      onChange={(e) => update("notFoundTitle", e.target.value)}
                      placeholder={DEFAULT_NOT_FOUND_TITLE}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Alt başlık</label>
                    <input
                      className={inputClass}
                      value={form.notFoundSubtitle}
                      onChange={(e) => update("notFoundSubtitle", e.target.value)}
                      placeholder={DEFAULT_NOT_FOUND_SUBTITLE}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Açıklama</label>
                    <textarea
                      className={inputClass}
                      rows={3}
                      value={form.notFoundBody}
                      onChange={(e) => update("notFoundBody", e.target.value)}
                      placeholder={DEFAULT_NOT_FOUND_BODY}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Yardım metni</label>
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={form.notFoundHint}
                      onChange={(e) => update("notFoundHint", e.target.value)}
                      placeholder={DEFAULT_NOT_FOUND_HINT}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Arama kutusu metni</label>
                    <input
                      className={inputClass}
                      value={form.notFoundSearchPlaceholder}
                      onChange={(e) => update("notFoundSearchPlaceholder", e.target.value)}
                      placeholder={DEFAULT_NOT_FOUND_SEARCH_PLACEHOLDER}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Alt not</label>
                    <input
                      className={inputClass}
                      value={form.notFoundFooterNote}
                      onChange={(e) => update("notFoundFooterNote", e.target.value)}
                      placeholder={DEFAULT_NOT_FOUND_FOOTER_NOTE}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Link2 size={18} className="text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Hızlı linkler</h2>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setQuickLinks((prev) => [
                        ...prev,
                        { label: "", href: "/catalog", description: "" },
                      ])
                    }
                  >
                    <Plus size={14} className="mr-1" />
                    Yeni link
                  </Button>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <div className="grid grid-cols-[1.1fr_1fr_1.4fr_auto] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <span>Etiket</span>
                    <span>Adres</span>
                    <span>Açıklama</span>
                    <span />
                  </div>
                  <div className="divide-y divide-gray-200">
                    {quickLinks.map((item, index) => (
                      <div key={`${index}-${item.href}`} className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[1.1fr_1fr_1.4fr_auto] md:items-center">
                        <input
                          className={inputClass}
                          value={item.label}
                          onChange={(e) => updateQuickLink(index, "label", e.target.value)}
                          placeholder="Ana sayfa"
                        />
                        <input
                          className={inputClass}
                          value={item.href}
                          onChange={(e) => updateQuickLink(index, "href", e.target.value)}
                          placeholder="/catalog"
                        />
                        <input
                          className={inputClass}
                          value={item.description}
                          onChange={(e) => updateQuickLink(index, "description", e.target.value)}
                          placeholder="Kısa açıklama"
                        />
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => setQuickLinks((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 size={14} />
                          Sil
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Route size={18} className="text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Redirect eşleştirmeleri</h2>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRedirectRules((prev) => [
                        ...prev,
                        { fromPath: "", toPath: "/", matchType: "exact", statusCode: 301, active: true, note: "" },
                      ])
                    }
                  >
                    <Plus size={14} className="mr-1" />
                    Yeni kural
                  </Button>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <div className="grid grid-cols-[1fr_1fr_0.9fr_0.8fr_0.8fr_1.2fr_auto] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <span>Kaynak</span>
                    <span>Hedef</span>
                    <span>Tip</span>
                    <span>Kod</span>
                    <span>Aktif</span>
                    <span>Not</span>
                    <span />
                  </div>
                  <div className="divide-y divide-gray-200">
                    {redirectRules.map((item, index) => (
                      <div
                        key={`${index}-${item.fromPath}-${item.toPath}`}
                        className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[1fr_1fr_0.9fr_0.8fr_0.8fr_1.2fr_auto] md:items-center"
                      >
                        <input
                          className={inputClass}
                          value={item.fromPath}
                          onChange={(e) => updateRedirectRule(index, "fromPath", e.target.value)}
                          placeholder="/eski-link"
                        />
                        <input
                          className={inputClass}
                          value={item.toPath}
                          onChange={(e) => updateRedirectRule(index, "toPath", e.target.value)}
                          placeholder="/yeni-link"
                        />
                        <select
                          className={inputClass}
                          value={item.matchType}
                          onChange={(e) => updateRedirectRule(index, "matchType", e.target.value)}
                        >
                          <option value="exact">exact</option>
                          <option value="prefix">prefix</option>
                        </select>
                        <select
                          className={inputClass}
                          value={item.statusCode}
                          onChange={(e) => updateRedirectRule(index, "statusCode", Number(e.target.value) as 301 | 302 | 307 | 308)}
                        >
                          <option value={301}>301</option>
                          <option value={302}>302</option>
                          <option value={307}>307</option>
                          <option value={308}>308</option>
                        </select>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={item.active}
                            onChange={(e) => updateRedirectRule(index, "active", e.target.checked)}
                          />
                          Açık
                        </label>
                        <input
                          className={inputClass}
                          value={item.note}
                          onChange={(e) => updateRedirectRule(index, "note", e.target.value)}
                          placeholder="İsteğe bağlı not"
                        />
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => setRedirectRules((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 size={14} />
                          Sil
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <p className="font-medium">Kısa not</p>
                  <p className="mt-1 text-xs text-blue-800/90">
                    `exact` yalnızca birebir eşleşir. `prefix` aynı klasör altındaki eski yolları da yakalar.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save size={14} className="mr-1" />
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </Button>
        </div>
      )}
    </div>
  );
}
