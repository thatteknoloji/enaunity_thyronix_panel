"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2, RefreshCw } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Tab = "geo" | "industries" | "categories" | "intents" | "patterns";

type GeoLevel = "countries" | "provinces" | "districts" | "neighborhoods" | "villages";

type Row = Record<string, unknown>;

export function DataUniverseAdmin() {
  const [tab, setTab] = useState<Tab>("geo");
  const [geoLevel, setGeoLevel] = useState<GeoLevel>("provinces");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const loadGeoStats = useCallback(async () => {
    const r = await fetch("/api/admin/page-factory/geo?entity=stats");
    const d = await r.json();
    if (d.success) setStats(d.data);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "geo") {
        const r = await fetch(`/api/admin/page-factory/geo?entity=${geoLevel}&page=${page}&limit=50&activeOnly=false`);
        const d = await r.json();
        if (!d.success) throw new Error(d.error);
        setRows(d.data.items || []);
        setTotal(d.data.total || 0);
      } else {
        const entity =
          tab === "industries"
            ? "industries"
            : tab === "categories"
              ? "categories"
              : tab === "intents"
                ? "intents"
                : "question-patterns";
        const r = await fetch(`/api/admin/page-factory/reference?entity=${entity}&page=${page}&limit=50&activeOnly=false`);
        const d = await r.json();
        if (!d.success) throw new Error(d.error);
        setRows(d.data.items || []);
        setTotal(d.data.total || 0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [tab, geoLevel, page]);

  useEffect(() => {
    loadGeoStats();
  }, [loadGeoStats]);

  useEffect(() => {
    setPage(1);
  }, [tab, geoLevel]);

  useEffect(() => {
    load();
  }, [load]);

  const saveGeo = async () => {
    const body: Record<string, unknown> = { entity: geoLevel, ...form };
    if (form.id) body.id = form.id;
    const r = await fetch("/api/admin/page-factory/geo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!d.success) {
      setError(d.error);
      return;
    }
    setForm({});
    load();
    loadGeoStats();
  };

  const saveRef = async () => {
    const entity =
      tab === "industries"
        ? "industries"
        : tab === "categories"
          ? "categories"
          : tab === "intents"
            ? "intents"
            : "question-patterns";
    const body: Record<string, unknown> = { entity, ...form };
    if (form.id) body.id = form.id;
    const r = await fetch("/api/admin/page-factory/reference", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!d.success) {
      setError(d.error);
      return;
    }
    setForm({});
    load();
  };

  const removeGeo = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    await fetch(`/api/admin/page-factory/geo?entity=${geoLevel}&id=${id}`, { method: "DELETE" });
    load();
    loadGeoStats();
  };

  const removeRef = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    const entity =
      tab === "industries"
        ? "industries"
        : tab === "categories"
          ? "categories"
          : tab === "intents"
            ? "intents"
            : "question-patterns";
    await fetch(`/api/admin/page-factory/reference?entity=${entity}&id=${id}`, { method: "DELETE" });
    load();
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "geo", label: "GEO" },
    { id: "industries", label: "Sektörler" },
    { id: "categories", label: "Kategoriler" },
    { id: "intents", label: "Niyetler" },
    { id: "patterns", label: "Soru Kalıpları" },
  ];

  const geoLevels: { id: GeoLevel; label: string }[] = [
    { id: "countries", label: "Ülke" },
    { id: "provinces", label: "İl" },
    { id: "districts", label: "İlçe" },
    { id: "neighborhoods", label: "Mahalle" },
    { id: "villages", label: "Köy" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={toAdminUrl("/admin/page-factory")} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">Data Universe V2</p>
          <h1 className="text-2xl font-bold text-gray-900">Veri Evreni Yönetimi</h1>
          <p className="text-sm text-gray-500">GEO · Bulk import · Sektör · Niyet · Soru kalıpları</p>
        </div>
        <Link
          href={toAdminUrl("/admin/page-factory/data/import")}
          className="ml-auto rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100"
        >
          Bulk Import →
        </Link>
        <button type="button" onClick={() => { load(); loadGeoStats(); }} className="p-2 text-gray-500 hover:text-gray-700">
          <RefreshCw size={16} />
        </button>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-5 text-center">
          {[
            { k: "countries", l: "Ülke" },
            { k: "provinces", l: "İl" },
            { k: "districts", l: "İlçe" },
            { k: "neighborhoods", l: "Mahalle" },
            { k: "villages", l: "Köy" },
          ].map(({ k, l }) => (
            <div key={k} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <p className="text-lg font-bold text-violet-700">{stats[k] ?? 0}</p>
              <p className="text-[10px] uppercase text-gray-500">{l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${tab === t.id ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "geo" && (
        <div className="flex flex-wrap gap-2">
          {geoLevels.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setGeoLevel(l.id)}
              className={`rounded-lg px-3 py-1 text-xs font-medium border ${geoLevel === l.id ? "border-violet-400 bg-violet-50 text-violet-800" : "border-gray-200 text-gray-600"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <p className="text-sm font-semibold text-gray-700">{total} kayıt</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-xs px-2 py-1 border rounded disabled:opacity-40">
                Önceki
              </button>
              <span className="text-xs text-gray-500 self-center">Sayfa {page}</span>
              <button type="button" disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)} className="text-xs px-2 py-1 border rounded disabled:opacity-40">
                Sonraki
              </button>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-violet-500" /></div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
              {rows.map((row) => (
                <div key={String(row.id)} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                  <button
                    type="button"
                    className="text-left text-sm flex-1 min-w-0"
                    onClick={() =>
                      setForm(
                        Object.fromEntries(
                          Object.entries(row).map(([k, v]) => [k, v == null ? "" : String(v)])
                        ) as Record<string, string>
                      )
                    }
                  >
                    <p className="font-medium text-gray-900 truncate">
                      {String(row.name || row.title || row.code || row.id)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {row.plateCode ? `Plaka ${row.plateCode}` : ""}
                      {row.slug ? ` · ${row.slug}` : ""}
                      {row.pattern ? ` · ${row.pattern}` : ""}
                    </p>
                  </button>
                  <button type="button" onClick={() => (tab === "geo" ? removeGeo(String(row.id)) : removeRef(String(row.id)))} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {rows.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">Kayıt yok — seed çalıştırın veya ekleyin</p>}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Plus size={14} /> {form.id ? "Düzenle" : "Yeni Kayıt"}
          </h3>

          {tab === "geo" && geoLevel === "countries" && (
            <>
              <input placeholder="Kod (TR)" value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Ad" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </>
          )}
          {tab === "geo" && geoLevel === "provinces" && (
            <>
              <input placeholder="countryId" value={form.countryId || ""} onChange={(e) => setForm({ ...form, countryId: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Plaka" value={form.plateCode || ""} onChange={(e) => setForm({ ...form, plateCode: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="İl adı" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </>
          )}
          {tab === "geo" && (geoLevel === "districts" || geoLevel === "neighborhoods" || geoLevel === "villages") && (
            <>
              <input
                placeholder={geoLevel === "districts" ? "provinceId" : "districtId"}
                value={form[geoLevel === "districts" ? "provinceId" : "districtId"] || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [geoLevel === "districts" ? "provinceId" : "districtId"]: e.target.value,
                  })
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input placeholder="Ad" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </>
          )}

          {tab === "industries" && (
            <>
              <input placeholder="Sektör adı" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Açıklama" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </>
          )}
          {tab === "categories" && (
            <>
              <input placeholder="industryId" value={form.industryId || ""} onChange={(e) => setForm({ ...form, industryId: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Kategori adı" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </>
          )}
          {tab === "intents" && (
            <>
              <input placeholder="Niyet adı" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Açıklama" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </>
          )}
          {tab === "patterns" && (
            <>
              <input placeholder="Başlık" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Kalıp ({topic} nedir?)" value={form.pattern || ""} onChange={(e) => setForm({ ...form, pattern: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Tip (info, price…)" value={form.type || "general"} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={tab === "geo" ? saveGeo : saveRef}
              className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              Kaydet
            </button>
            {form.id && (
              <button type="button" onClick={() => setForm({})} className="rounded-lg border px-3 py-2 text-sm text-gray-600">
                İptal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
