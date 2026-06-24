"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Eye,
  FileText,
  Globe,
  LayoutDashboard,
  Loader2,
  MapPin,
  Play,
  Sparkles,
  Upload,
} from "lucide-react";
import { BLOG_GEO_PROVINCES } from "@/lib/blog-engine/blog-types";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";
import { getDefaultGeoCities } from "@/lib/geo/turkiye-geo-source";
import { labelSourceType, MODULE_TITLES } from "@/lib/admin/ui-labels";

type Tab = "dashboard" | "generate" | "published" | "drafts" | "archive";

type Stats = {
  total: number;
  drafts: number;
  review: number;
  published: number;
  archived: number;
  categoryCount: number;
  geoCount: number;
  avgSeoScore: number;
  avgGeoScore: number;
  avgQualityScore: number;
};

type BlogPostItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  sourceType: string;
  keyword: string;
  province: string | null;
  qualityScore: number;
  publishedAt: string | null;
  updatedAt: string;
};

const SOURCE_OPTIONS = [
  { value: "KEYWORD", label: labelSourceType("KEYWORD") },
  { value: "KEYWORD_GROUP", label: labelSourceType("KEYWORD_GROUP") },
  { value: "PRODUCT", label: labelSourceType("PRODUCT") },
  { value: "CATEGORY", label: labelSourceType("CATEGORY") },
  { value: "GEO", label: labelSourceType("GEO") },
  { value: "COMPETITOR_STRUCTURE", label: labelSourceType("COMPETITOR_STRUCTURE") },
];

export function BlogEngineShell() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const [sourceType, setSourceType] = useState("KEYWORD");
  const [keyword, setKeyword] = useState("cam tablo bayiliği");
  const [keywords, setKeywords] = useState("cam tablo\nev dekorasyonu\nbayilik");
  const [keywordGroup, setKeywordGroup] = useState("cam tablo grubu");
  const [productId, setProductId] = useState("");
  const [productBlogType, setProductBlogType] = useState("usage");
  const [category, setCategory] = useState("Cam Tablo");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [competitorStructure, setCompetitorStructure] = useState(
    "# Giriş\n## Nedir?\n## Nasıl Seçilir?\n## Karşılaştırma\n## SSS\n1. Fiyat nedir?\n2. Nereden alınır?"
  );
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [geoProvinces, setGeoProvinces] = useState<string[]>([...getDefaultGeoCities(10)]);

  const loadStats = useCallback(async () => {
    try {
      const d = await fetchPageFactoryJson<Stats>("/api/admin/blog-engine/stats");
      if (d.success && d.data) setStats(d.data);
    } catch {
      /* ignore */
    }
  }, []);

  const loadPosts = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const q = status ? `?status=${status}&limit=50` : "?limit=50";
      const d = await fetchPageFactoryJson<{ items: BlogPostItem[] }>(`/api/admin/blog-engine/posts${q}`);
      if (d.success && d.data) setPosts(d.data.items || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    fetchPageFactoryJson<{ items: Array<{ name: string }> }>("/api/admin/page-factory/geo?entity=provinces&limit=81")
      .then((d) => {
        if (d.success && d.data?.items?.length) {
          setGeoProvinces(d.data.items.map((p) => p.name));
        }
      })
      .catch(() => {
        setGeoProvinces([...BLOG_GEO_PROVINCES]);
      });
  }, [loadStats]);

  useEffect(() => {
    if (tab === "published") loadPosts("PUBLISHED");
    else if (tab === "drafts") loadPosts("DRAFT");
    else if (tab === "archive") loadPosts("ARCHIVED");
  }, [tab, loadPosts]);

  const buildBody = (dryRun = false, autoPublish = false) => ({
    sourceType,
    keyword: keyword.trim() || undefined,
    keywords: keywords
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
    keywordGroup: keywordGroup.trim() || undefined,
    productId: productId.trim() || undefined,
    productBlogType: sourceType === "PRODUCT" ? productBlogType : undefined,
    category: category.trim() || undefined,
    province: province.trim() || undefined,
    district: district.trim() || undefined,
    competitorStructure: competitorStructure.trim() || undefined,
    competitorUrl: competitorUrl.trim() || undefined,
    dryRun,
    autoPublish,
  });

  const runPreview = async () => {
    setError(null);
    setPreview(null);
    setLoading(true);
    try {
      const d = await fetchPageFactoryJson("/api/admin/blog-engine/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      if (!d.success) throw new Error(d.error || "Preview başarısız");
      setPreview(d.data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview başarısız");
    } finally {
      setLoading(false);
    }
  };

  const runGenerate = async (autoPublish = false) => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const d = await fetchPageFactoryJson("/api/admin/blog-engine/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(false, autoPublish)),
      });
      if (!d.success) throw new Error(d.error || "Generate başarısız");
      setResult(d.data);
      await loadStats();
      if (tab !== "generate") {
        if (autoPublish) loadPosts("PUBLISHED");
        else loadPosts("DRAFT");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate başarısız");
    } finally {
      setLoading(false);
    }
  };

  const publishPost = async (id: string) => {
    setLoading(true);
    try {
      const d = await fetchPageFactoryJson(`/api/admin/blog-engine/posts/${id}/publish`, { method: "POST" });
      if (!d.success) throw new Error(d.error);
      await loadStats();
      loadPosts(tab === "published" ? "PUBLISHED" : "DRAFT");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yayınlama başarısız");
    } finally {
      setLoading(false);
    }
  };

  const archivePost = async (id: string) => {
    setLoading(true);
    try {
      const d = await fetchPageFactoryJson(`/api/admin/blog-engine/posts/${id}/archive`, { method: "POST" });
      if (!d.success) throw new Error(d.error);
      await loadStats();
      loadPosts("ARCHIVED");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Arşivleme başarısız");
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
    { id: "dashboard", label: "Genel Bakış", icon: LayoutDashboard },
    { id: "generate", label: "Oluştur", icon: Sparkles },
    { id: "published", label: "Yayında", icon: Globe },
    { id: "drafts", label: "Taslaklar", icon: FileText },
    { id: "archive", label: "Arşiv", icon: Archive },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-600 p-2 text-white">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{MODULE_TITLES.blogEngine}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Özgün SEO / GEO / AEO blog üretimi — Sayfa Merkezi ile entegre çalışır.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && stats ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Toplam", value: stats.total },
              { label: "Yayında", value: stats.published },
              { label: "Taslak", value: stats.drafts },
              { label: "Arşiv", value: stats.archived },
              { label: "İncelemede", value: stats.review },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500 uppercase">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Kategori", value: stats.categoryCount },
              { label: "GEO İçerik", value: stats.geoCount },
              { label: "Ort. SEO", value: stats.avgSeoScore },
              { label: "Ort. GEO", value: stats.avgGeoScore },
              { label: "Ort. Kalite", value: stats.avgQualityScore },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="text-xs text-emerald-700 uppercase">{label}</p>
                <p className="text-2xl font-bold text-emerald-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "generate" ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-xs text-gray-600">
              Kaynak Tipi
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-gray-600">
              Anahtar Kelime
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            {sourceType === "KEYWORD_GROUP" ? (
              <>
                <label className="block text-xs text-gray-600 md:col-span-2">
                  Keywords (satır veya virgülle)
                  <textarea
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-gray-600">
                  Grup Adı
                  <input
                    value={keywordGroup}
                    onChange={(e) => setKeywordGroup(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
              </>
            ) : null}
            {sourceType === "PRODUCT" ? (
              <>
                <label className="block text-xs text-gray-600">
                  Product ID
                  <input
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    placeholder="Product Universe ID"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
                  />
                </label>
                <label className="block text-xs text-gray-600">
                  Blog Tipi
                  <select
                    value={productBlogType}
                    onChange={(e) => setProductBlogType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="usage">Kullanım Rehberi</option>
                    <option value="benefits">Avantajlar</option>
                    <option value="comparison">Karşılaştırma</option>
                    <option value="purchase">Satın Alma Rehberi</option>
                    <option value="faq">SSS</option>
                  </select>
                </label>
              </>
            ) : null}
            {sourceType === "CATEGORY" ? (
              <label className="block text-xs text-gray-600">
                Kategori
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
            ) : null}
            {sourceType === "GEO" ? (
              <>
                <label className="block text-xs text-gray-600">
                  İl (boş = ilk 10 il)
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Tümü (10 il)</option>
                    {geoProvinces.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-gray-600">
                  İlçe (opsiyonel)
                  <input
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
              </>
            ) : null}
            {sourceType === "COMPETITOR_STRUCTURE" ? (
              <>
                <label className="block text-xs text-gray-600 md:col-span-2">
                  Rakip Yapı (yalnızca iskelet — kopyalama yok)
                  <textarea
                    value={competitorStructure}
                    onChange={(e) => setCompetitorStructure(e.target.value)}
                    rows={6}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
                  />
                </label>
                <label className="block text-xs text-gray-600">
                  Rakip URL (opsiyonel)
                  <input
                    value={competitorUrl}
                    onChange={(e) => setCompetitorUrl(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runPreview}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
              Önizle
            </button>
            <button
              type="button"
              onClick={() => runGenerate(false)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              Oluştur
            </button>
            <button
              type="button"
              onClick={() => runGenerate(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Oluştur ve Yayınla
            </button>
          </div>

          {preview ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm space-y-2">
              <p>
                <strong>Başlık:</strong> {String(preview.title)}
              </p>
              <p>
                <strong>Slug:</strong> {String(preview.slug)}
              </p>
              <p>
                <strong>Kalite:</strong>{" "}
                {JSON.stringify((preview.quality as { qualityScore?: number })?.qualityScore)}
              </p>
              <p className="text-gray-600 line-clamp-3">{String(preview.excerpt)}</p>
            </div>
          ) : null}

          {result ? (
            <pre className="rounded-lg border border-gray-200 bg-gray-900 text-gray-100 p-4 text-xs overflow-auto max-h-48">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}

      {["published", "drafts", "archive"].includes(tab) ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <Loader2 className="animate-spin inline" size={20} />
            </div>
          ) : posts.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Kayıt yok.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3">Başlık</th>
                  <th className="px-4 py-3">Kaynak</th>
                  <th className="px-4 py-3">Kalite</th>
                  <th className="px-4 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.title}</div>
                      <div className="text-xs text-gray-500">{p.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.sourceType}
                      {p.province ? (
                        <span className="flex items-center gap-1 text-gray-500">
                          <MapPin size={10} /> {p.province}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{p.qualityScore}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {p.status === "PUBLISHED" ? (
                          <Link
                            href={`/blog/${p.slug}`}
                            target="_blank"
                            className="text-emerald-600 hover:underline text-xs"
                          >
                            Görüntüle
                          </Link>
                        ) : null}
                        {p.status === "DRAFT" ? (
                          <button
                            type="button"
                            onClick={() => publishPost(p.id)}
                            className="text-violet-600 hover:underline text-xs"
                          >
                            Yayınla
                          </button>
                        ) : null}
                        {p.status !== "ARCHIVED" ? (
                          <button
                            type="button"
                            onClick={() => archivePost(p.id)}
                            className="text-gray-500 hover:underline text-xs"
                          >
                            Arşivle
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}
