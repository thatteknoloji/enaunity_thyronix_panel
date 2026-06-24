"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  GitBranch,
  LayoutDashboard,
  Link2,
  Loader2,
  Map as MapIcon,
  Network,
  Play,
  PlusCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type Tab = "dashboard" | "create" | "plans" | "content-map" | "link-map";

type Dashboard = {
  totalPlans: number;
  totalContentTargets: number;
  totalGeoTargets: number;
  recentPlans: Array<{
    id: string;
    name: string;
    primaryKeyword: string;
    status: string;
    estimatedContentCount: number;
    estimatedGeoCount: number;
    createdAt: string;
  }>;
};

type PlanListItem = {
  id: string;
  name: string;
  primaryKeyword: string;
  status: string;
  estimatedContentCount: number;
  estimatedGeoCount: number;
  estimatedFaqCount: number;
  createdAt: string;
  _count?: { nodes: number };
};

type Preview = {
  name: string;
  primaryKeyword: string;
  nodes: Array<{ title: string; nodeType: string; estimatedTraffic: number }>;
  traffic: {
    estimatedContentCount: number;
    estimatedGeoCount: number;
    estimatedFaqCount: number;
    estimatedClusterCount: number;
    totalTraffic: number;
  };
  contentMap: {
    sections: { landing: string[]; blogs: string[]; faq: string[]; geo: string[]; categories: string[] };
    nodes: Array<{ id: string; title: string; nodeType: string; parentNodeId: string | null }>;
  };
  internalLinkMap: Array<{
    nodeId: string;
    title: string;
    parent: string[];
    children: string[];
    siblings: string[];
  }>;
};

const ENGINES = [
  { id: "BLOG", label: "Blog Merkezi" },
  { id: "GEO", label: "GEO İçerik Fabrikası" },
  { id: "PAGE", label: "Sayfa Merkezi" },
] as const;

export function ContentPlanningShell() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planDetail, setPlanDetail] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  const [keyword, setKeyword] = useState("cam tablo bayiliği");
  const [keywordGroup, setKeywordGroup] = useState("");
  const [category, setCategory] = useState("");
  const [includeGeo, setIncludeGeo] = useState(true);
  const [selectedEngines, setSelectedEngines] = useState<string[]>(["BLOG", "GEO"]);

  const loadDashboard = useCallback(async () => {
    const d = await fetchPageFactoryJson<Dashboard>("/api/admin/content-planning/stats");
    if (d.success && d.data) setDashboard(d.data);
  }, []);

  const loadPlans = useCallback(async () => {
    const d = await fetchPageFactoryJson<{ plans: PlanListItem[] }>("/api/admin/content-planning/plans");
    if (d.success && d.data) setPlans(d.data.plans || []);
  }, []);

  const loadPlanDetail = useCallback(async (planId: string) => {
    const d = await fetchPageFactoryJson<{
      plan: PlanListItem;
      contentMap: Preview["contentMap"];
      internalLinkMap: Preview["internalLinkMap"];
      nodes: Preview["nodes"];
    }>(`/api/admin/content-planning/plans/${planId}`);
    if (d.success && d.data) {
      setPlanDetail({
        name: d.data.plan.name,
        primaryKeyword: d.data.plan.primaryKeyword,
        nodes: (d.data.nodes || []).map((n: { title: string; nodeType: string; estimatedTraffic: number }) => ({
          title: n.title,
          nodeType: n.nodeType,
          estimatedTraffic: n.estimatedTraffic,
        })),
        traffic: {
          estimatedContentCount: d.data.plan.estimatedContentCount,
          estimatedGeoCount: d.data.plan.estimatedGeoCount,
          estimatedFaqCount: d.data.plan.estimatedFaqCount,
          estimatedClusterCount: 0,
          totalTraffic: 0,
        },
        contentMap: d.data.contentMap,
        internalLinkMap: d.data.internalLinkMap,
      });
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (tab === "dashboard") loadDashboard();
    else if (tab === "plans" || tab === "content-map" || tab === "link-map") loadPlans();
  }, [tab, loadDashboard, loadPlans]);

  useEffect(() => {
    if (selectedPlanId && (tab === "content-map" || tab === "link-map")) {
      loadPlanDetail(selectedPlanId);
    }
  }, [selectedPlanId, tab, loadPlanDetail]);

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const d = await fetchPageFactoryJson<Preview>("/api/admin/content-planning/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          primaryKeyword: keyword,
          keywordGroup: keywordGroup ? keywordGroup.split(",").map((s) => s.trim()) : undefined,
          category: category || undefined,
          includeGeo,
          planType: "cluster",
        }),
      });
      if (!d.success) throw new Error(d.error);
      setPreview(d.data || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Önizleme hatası");
    } finally {
      setLoading(false);
    }
  };

  const runCreate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const d = await fetchPageFactoryJson("/api/admin/content-planning/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          primaryKeyword: keyword,
          keywordGroup: keywordGroup ? keywordGroup.split(",").map((s) => s.trim()) : undefined,
          category: category || undefined,
          includeGeo,
          planType: "cluster",
        }),
      });
      if (!d.success) throw new Error(d.error);
      setResult(d.data);
      await loadDashboard();
      await loadPlans();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan oluşturma hatası");
    } finally {
      setLoading(false);
    }
  };

  const runPublish = async (planId: string) => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchPageFactoryJson("/api/admin/content-planning/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          planId,
          engines: selectedEngines,
          dryRun: true,
        }),
      });
      if (!d.success) throw new Error(d.error);
      setResult(d.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yayın hatası");
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "create", label: "Plan Oluştur", icon: PlusCircle },
    { id: "plans", label: "Planlar", icon: MapIcon },
    { id: "content-map", label: "İçerik Haritası", icon: GitBranch },
    { id: "link-map", label: "İç Link Haritası", icon: Network },
  ];

  const displayMap = planDetail || preview;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapIcon className="h-7 w-7 text-violet-600" />
            İçerik Planlama Merkezi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Keyword kümeleri, topic cluster ve GEO yayılım planları — tüm üretimin başlangıç noktası
          </p>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded bg-violet-50 text-violet-700 border border-violet-200">
          ENA_ICERIK_PLANLAMA_MERKEZI_V1
        </span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition ${
              tab === t.id ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {tab === "dashboard" && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Toplam Plan", value: dashboard.totalPlans },
              { label: "İçerik Hedefi", value: dashboard.totalContentTargets },
              { label: "GEO Hedefi", value: dashboard.totalGeoTargets },
              { label: "Son Planlar", value: dashboard.recentPlans.length },
            ].map((c) => (
              <div key={c.label} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">{c.label}</div>
                <div className="text-2xl font-bold">{c.value}</div>
              </div>
            ))}
          </div>
          <PlanTable
            plans={dashboard.recentPlans.map((p) => ({
              ...p,
              estimatedFaqCount: 0,
              _count: { nodes: p.estimatedContentCount },
            }))}
            onSelect={setSelectedPlanId}
            onPublish={runPublish}
          />
        </div>
      )}

      {tab === "create" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold">Plan Formu</h2>
            <label className="block text-sm">
              <span className="text-gray-600">Keyword</span>
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Keyword Group (virgülle)</span>
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={keywordGroup} onChange={(e) => setKeywordGroup(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Kategori</span>
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeGeo} onChange={(e) => setIncludeGeo(e.target.checked)} />
              GEO içerikleri dahil et
            </label>
            <div>
              <span className="text-sm text-gray-600">Motorlara Gönder</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {ENGINES.map((e) => (
                  <button
                    key={e.id}
                    onClick={() =>
                      setSelectedEngines((prev) =>
                        prev.includes(e.id) ? prev.filter((x) => x !== e.id) : [...prev, e.id]
                      )
                    }
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      selectedEngines.includes(e.id)
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={runPreview} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Önizleme
              </button>
              <button onClick={runCreate} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">
                <Play className="h-4 w-4" />
                Plan Oluştur
              </button>
            </div>
          </div>
          <PreviewPanel preview={preview} result={result} />
        </div>
      )}

      {tab === "plans" && (
        <PlanTable plans={plans} onSelect={setSelectedPlanId} onPublish={runPublish} />
      )}

      {(tab === "content-map" || tab === "link-map") && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600">Plan seç:</span>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={selectedPlanId || ""}
              onChange={(e) => setSelectedPlanId(e.target.value || null)}
            >
              <option value="">— Seçin —</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {tab === "content-map" && displayMap && <ContentMapView map={displayMap.contentMap} />}
          {tab === "link-map" && displayMap && <LinkMapView links={displayMap.internalLinkMap} nodes={displayMap.contentMap?.nodes || []} />}
        </div>
      )}
    </div>
  );
}

function PreviewPanel({ preview, result }: { preview: Preview | null; result: unknown }) {
  if (!preview && !result) {
    return (
      <div className="bg-white border rounded-xl p-5 text-sm text-gray-500">
        Önizleme için formu doldurup &quot;Önizleme&quot; butonuna tıklayın.
      </div>
    );
  }
  const data = preview;
  return (
    <div className="bg-white border rounded-xl p-5 space-y-4">
      <h2 className="font-semibold">Önizleme</h2>
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="İçerik" value={data.traffic.estimatedContentCount} />
            <Stat label="GEO" value={data.traffic.estimatedGeoCount} />
            <Stat label="FAQ" value={data.traffic.estimatedFaqCount} />
            <Stat label="Cluster" value={data.traffic.estimatedClusterCount} />
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Planlanan Node&apos;lar</div>
            <ul className="text-sm space-y-1 max-h-64 overflow-auto">
              {data.nodes.map((n, i) => (
                <li key={i} className="flex justify-between gap-2 border-b py-1">
                  <span>
                    <TypeBadge type={n.nodeType} /> {n.title}
                  </span>
                  <span className="text-gray-400">{n.estimatedTraffic}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      {result ? (
        <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-40">{JSON.stringify(result, null, 2)}</pre>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-gray-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    LANDING: "bg-violet-100 text-violet-700",
    BLOG: "bg-blue-100 text-blue-700",
    FAQ: "bg-amber-100 text-amber-700",
    GEO_PROVINCE: "bg-emerald-100 text-emerald-700",
    CATEGORY: "bg-pink-100 text-pink-700",
    PRODUCT: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[type] || "bg-gray-100"}`}>{type}</span>
  );
}

function PlanTable({
  plans,
  onSelect,
  onPublish,
}: {
  plans: PlanListItem[];
  onSelect: (id: string) => void;
  onPublish: (id: string) => void;
}) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left p-3">Plan</th>
            <th className="text-left p-3">Keyword</th>
            <th className="text-left p-3">Durum</th>
            <th className="text-right p-3">İçerik</th>
            <th className="text-right p-3">GEO</th>
            <th className="text-right p-3">FAQ</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-3 font-medium">{p.name}</td>
              <td className="p-3">{p.primaryKeyword}</td>
              <td className="p-3">{p.status}</td>
              <td className="p-3 text-right">{p.estimatedContentCount}</td>
              <td className="p-3 text-right">{p.estimatedGeoCount}</td>
              <td className="p-3 text-right">{p.estimatedFaqCount}</td>
              <td className="p-3 text-right space-x-2">
                <button onClick={() => onSelect(p.id)} className="text-violet-600 hover:underline text-xs">
                  Harita
                </button>
                <button onClick={() => onPublish(p.id)} className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1">
                  <Send className="h-3 w-3" />
                  Gönder
                </button>
              </td>
            </tr>
          ))}
          {plans.length === 0 && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-gray-500">
                Plan bulunamadı
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ContentMapView({ map }: { map: Preview["contentMap"] }) {
  const nodeById = new Map(map.nodes.map((n) => [n.id, n]));
  const renderTree = (nodeId: string, depth = 0): React.ReactNode => {
    const node = nodeById.get(nodeId);
    if (!node) return null;
    const children = map.nodes.filter((n) => n.parentNodeId === nodeId);
    return (
      <div key={nodeId} style={{ marginLeft: depth * 16 }}>
        <div className="flex items-center gap-2 py-1 text-sm">
          {depth > 0 && <span className="text-gray-300">├──</span>}
          <TypeBadge type={node.nodeType} />
          <span>{node.title}</span>
        </div>
        {children.map((c) => renderTree(c.id, depth + 1))}
      </div>
    );
  };

  const roots = map.nodes.filter((n) => !n.parentNodeId);
  return (
    <div className="bg-white border rounded-xl p-5 font-mono text-sm">
      <div className="font-sans font-semibold mb-4 flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-violet-600" />
        İçerik Haritası
      </div>
      <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-2 font-sans text-xs">
        {Object.entries(map.sections).map(([k, ids]) => (
          <div key={k} className="bg-gray-50 rounded p-2">
            <div className="text-gray-500 capitalize">{k}</div>
            <div className="font-bold">{ids.length}</div>
          </div>
        ))}
      </div>
      {roots.map((r) => renderTree(r.id))}
    </div>
  );
}

function LinkMapView({
  links,
  nodes,
}: {
  links: Preview["internalLinkMap"];
  nodes: Array<{ id: string; title: string }>;
}) {
  const titleById = new Map(nodes.map((n) => [n.id, n.title]));
  return (
    <div className="bg-white border rounded-xl p-5 space-y-3">
      <div className="font-semibold flex items-center gap-2">
        <Link2 className="h-4 w-4 text-violet-600" />
        İç Link Haritası
      </div>
      {links.map((link) => (
        <div key={link.nodeId} className="border rounded-lg p-3 text-sm">
          <div className="font-medium">{link.title}</div>
          <div className="text-xs text-gray-500 mt-1 grid grid-cols-3 gap-2">
            <div>
              <span className="font-medium">Parent:</span>{" "}
              {link.parent.map((id) => titleById.get(id) || id).join(", ") || "—"}
            </div>
            <div>
              <span className="font-medium">Children:</span> {link.children.length}
            </div>
            <div>
              <span className="font-medium">Siblings:</span> {link.siblings.length}
            </div>
          </div>
        </div>
      ))}
      {links.length === 0 && <p className="text-gray-500 text-sm">Link haritası yok — plan seçin veya önizleme yapın.</p>}
    </div>
  );
}
