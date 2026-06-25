"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, BadgeCheck, Barcode, Boxes, Copy, GitBranch, RefreshCw, ScanSearch, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { buildDuplicateMergePlan } from "@/lib/thyronix/duplicate-merge";

type DuplicateField = "all" | "barcode" | "stockCode" | "modelCode" | "externalId";

type DuplicateGroup = {
  field: Exclude<DuplicateField, "all">;
  fieldLabel: string;
  value: string;
  count: number;
  sourceCount: number;
  sourceNames: string[];
  statuses: string[];
  minPrice: number;
  maxPrice: number;
  totalStock: number;
  suggestedMasterId: string | null;
  suggestedMasterReason: string[];
  products: Array<{
    id: string;
    name: string;
    description?: string | null;
    brand: string | null;
    category: string | null;
    price: number;
    stock: number;
    status: string;
    barcode: string | null;
    stockCode: string | null;
    modelCode: string | null;
    externalId: string;
    image: string | null;
    createdAt: string;
    masterScore?: number;
    source: { id: string; name: string };
  }>;
};

type DuplicateResponse = {
  field: DuplicateField;
  groups: DuplicateGroup[];
  summary: {
    groupCount: number;
    affectedProducts: number;
    crossSourceGroups: number;
    types: Array<{ field: Exclude<DuplicateField, "all">; label: string; groupCount: number }>;
  };
};

const FIELD_OPTIONS: Array<{ value: DuplicateField; label: string; icon: typeof Copy }> = [
  { value: "all", label: "Tümü", icon: Copy },
  { value: "barcode", label: "Barkod", icon: Barcode },
  { value: "stockCode", label: "Stok Kodu", icon: Boxes },
  { value: "modelCode", label: "Model Kodu", icon: GitBranch },
  { value: "externalId", label: "Harici ID", icon: ScanSearch },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function statusTone(status: string) {
  if (status === "active") return "bg-nexa-success/10 text-nexa-success";
  if (status === "excluded") return "bg-nexa-danger/10 text-nexa-danger";
  return "bg-nexa-warning/10 text-nexa-warning";
}

export default function DuplicateProductsPanel({ initialField = "all" }: { initialField?: DuplicateField }) {
  const [field, setField] = useState<DuplicateField>(initialField);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DuplicateResponse | null>(null);
  const [processingKey, setProcessingKey] = useState<string | null>(null);

  const fetchData = async (nextField = field) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        field: nextField,
        limit: nextField === "all" ? "18" : "24",
      });
      const response = await fetch(`/api/thyronix/products/duplicates?${params.toString()}`);
      const json = await response.json();
      if (json.success) setData(json.data);
      else setData(null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(field);
  }, [field]);

  useEffect(() => {
    setField(initialField);
  }, [initialField]);

  const handleExcludeGroup = async (group: DuplicateGroup) => {
    const activeIds = group.products
      .filter((product) => product.status !== "excluded")
      .map((product) => product.id);

    if (activeIds.length === 0) {
      toast("Bu gruptaki ürünlerin tamamı zaten hariç tutulmuş.", { icon: "ℹ️" });
      return;
    }

    if (!confirm(`${group.value} grubundaki ${activeIds.length} aktif ürün hariç tutulsun mu?`)) return;

    setProcessingKey(`${group.field}-${group.value}`);
    try {
      const response = await fetch("/api/thyronix/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "exclude",
          scope: "ids",
          ids: activeIds,
        }),
      });
      const json = await response.json();
      if (json.success) {
        toast.success(`${activeIds.length} ürün hariç tutuldu`);
        fetchData(field);
      } else {
        toast.error(json.error || "Hariç tutma işlemi başarısız");
      }
    } catch {
      toast.error("Hariç tutma işlemi başarısız");
    } finally {
      setProcessingKey(null);
    }
  };

  const handleKeepSuggested = async (group: DuplicateGroup) => {
    if (!group.suggestedMasterId) {
      toast.error("Bu grup için ana kayıt önerisi üretilemedi");
      return;
    }

    const duplicateIds = group.products
      .filter((product) => product.id !== group.suggestedMasterId && product.status !== "excluded")
      .map((product) => product.id);

    if (duplicateIds.length === 0) {
      toast("Ana kayıt dışındaki tüm ürünler zaten hariç tutulmuş.", { icon: "ℹ️" });
      return;
    }

    if (!confirm(`${duplicateIds.length} kayıt hariç tutulacak, önerilen ana kayıt aktif kalacak. Devam edilsin mi?`)) return;

    setProcessingKey(`${group.field}-${group.value}-master`);
    try {
      const response = await fetch("/api/thyronix/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "exclude",
          scope: "ids",
          ids: duplicateIds,
        }),
      });
      const json = await response.json();
      if (json.success) {
        toast.success("Ana kayıt korundu, diğer kayıtlar hariç tutuldu");
        fetchData(field);
      } else {
        toast.error(json.error || "İşlem başarısız");
      }
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setProcessingKey(null);
    }
  };

  const handleApplySuggestedMerge = async (group: DuplicateGroup) => {
    if (!group.suggestedMasterId) {
      toast.error("Merge için ana kayıt bulunamadı");
      return;
    }

    const preview = buildDuplicateMergePlan(group.products, group.suggestedMasterId);
    const summary = preview.changedFields.slice(0, 5).map((item) => item.label).join(", ");
    const confirmText = summary
      ? `Ana kayıt zenginleştirilecek: ${summary}${preview.changedFields.length > 5 ? " ve devamı" : ""}. Devam edilsin mi?`
      : "Alan güncellemesi yok, sadece duplicate kayıtlar hariç tutulacak. Devam edilsin mi?";

    if (!confirm(confirmText)) return;

    setProcessingKey(`${group.field}-${group.value}-merge`);
    try {
      const response = await fetch("/api/thyronix/products/duplicates/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId: group.suggestedMasterId,
          duplicateIds: group.products.filter((product) => product.id !== group.suggestedMasterId).map((product) => product.id),
        }),
      });
      const json = await response.json();
      if (json.success) {
        toast.success("Önerilen merge uygulandı");
        fetchData(field);
      } else {
        toast.error(json.error || "Merge işlemi başarısız");
      }
    } catch {
      toast.error("Merge işlemi başarısız");
    } finally {
      setProcessingKey(null);
    }
  };

  const summaryCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Duplicate grup",
        value: data.summary.groupCount.toLocaleString("tr-TR"),
        tone: "text-nexa-text",
      },
      {
        label: "Etkilenen ürün",
        value: data.summary.affectedProducts.toLocaleString("tr-TR"),
        tone: "text-nexa-primary",
      },
      {
        label: "Çok kaynaklı grup",
        value: data.summary.crossSourceGroups.toLocaleString("tr-TR"),
        tone: "text-nexa-warning",
      },
    ];
  }, [data]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-nexa-border bg-nexa-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-nexa-text">Kopya Ürün Taraması</h3>
            <p className="mt-1 text-sm text-nexa-text-secondary">
              Aynı barkod, stok kodu, model kodu veya harici ID ile gelen ürünleri otomatik ayıklar.
            </p>
          </div>
          <button
            onClick={() => fetchData(field)}
            className="inline-flex items-center gap-2 rounded-lg border border-nexa-border px-3 py-2 text-sm text-nexa-text-secondary transition-colors hover:bg-nexa-hover hover:text-nexa-text"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Yenile
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {FIELD_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = field === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setField(option.value)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  active
                    ? "border-nexa-primary bg-nexa-primary/10 text-nexa-primary"
                    : "border-nexa-border text-nexa-text-secondary hover:bg-nexa-hover hover:text-nexa-text"
                }`}
              >
                <Icon size={14} />
                {option.label}
              </button>
            );
          })}
        </div>

        {data?.summary.types?.length ? (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-nexa-text-secondary">
            {data.summary.types.map((type) => (
              <span key={type.field} className="rounded-full border border-nexa-border px-2.5 py-1">
                {type.label}: {type.groupCount.toLocaleString("tr-TR")}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-nexa-border bg-nexa-card px-4 py-4">
            <p className={`text-2xl font-semibold ${card.tone}`}>{card.value}</p>
            <p className="mt-1 text-xs text-nexa-text-secondary">{card.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-nexa-border bg-nexa-card p-5">
              <div className="h-5 w-40 animate-pulse rounded bg-nexa-border/50" />
              <div className="mt-3 h-4 w-64 animate-pulse rounded bg-nexa-border/40" />
              <div className="mt-6 h-28 animate-pulse rounded-xl bg-nexa-border/30" />
            </div>
          ))}
        </div>
      ) : !data || data.groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-nexa-border bg-nexa-card px-6 py-14 text-center">
          <AlertTriangle size={42} className="mx-auto mb-4 text-nexa-text-secondary/30" />
          <h3 className="text-lg font-semibold text-nexa-text">Kopya grup bulunamadı</h3>
          <p className="mt-2 text-sm text-nexa-text-secondary">
            Bu filtre altında çakışan kimlik görünmüyor. Yeni senkron sonrası tekrar kontrol edebiliriz.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.groups.map((group) => (
            <div key={`${group.field}-${group.value}`} className="rounded-2xl border border-nexa-border bg-nexa-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-nexa-primary/10 px-2 py-1 text-[11px] font-medium text-nexa-primary">
                      {group.fieldLabel}
                    </span>
                    {group.sourceCount > 1 ? (
                      <span className="rounded-md bg-nexa-warning/10 px-2 py-1 text-[11px] font-medium text-nexa-warning">
                        {group.sourceCount} kaynak
                      </span>
                    ) : null}
                  </div>
                  <h4 className="mt-3 text-base font-semibold text-nexa-text break-all">{group.value}</h4>
                  <p className="mt-1 text-xs text-nexa-text-secondary">
                    {group.count.toLocaleString("tr-TR")} kayıt • stok {group.totalStock.toLocaleString("tr-TR")} • fiyat {formatCurrency(group.minPrice)} - {formatCurrency(group.maxPrice)}
                  </p>
                </div>
                <div className="rounded-xl border border-nexa-border px-3 py-2 text-right">
                  <p className="text-xl font-semibold text-nexa-text">{group.count}</p>
                  <p className="text-[11px] text-nexa-text-secondary">ürün</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-nexa-text-secondary">
                {group.sourceNames.map((sourceName) => (
                  <span key={sourceName} className="rounded-full border border-nexa-border px-2.5 py-1">
                    {sourceName}
                  </span>
                ))}
              </div>

              {group.suggestedMasterId ? (
                <div className="mt-4 rounded-xl border border-nexa-primary/20 bg-nexa-primary/5 px-3 py-3">
                  <div className="flex items-start gap-2">
                    <Sparkles size={15} className="mt-0.5 text-nexa-primary" />
                    <div>
                      <p className="text-xs font-semibold text-nexa-primary">Önerilen ana kayıt hazır</p>
                      <p className="mt-1 text-xs text-nexa-text-secondary">
                        Sistem; aktiflik, stok, görsel ve veri doluluğuna göre bir ana kayıt seçti.
                      </p>
                      {group.suggestedMasterReason.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.suggestedMasterReason.map((reason) => (
                            <span key={reason} className="rounded-full border border-nexa-primary/20 px-2 py-1 text-[10px] text-nexa-primary">
                              {reason}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {(() => {
                    const preview = buildDuplicateMergePlan(group.products, group.suggestedMasterId);
                    return preview.changedFields.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {preview.changedFields.slice(0, 6).map((change) => (
                          <span key={change.field} className="rounded-full border border-nexa-border px-2 py-1 text-[10px] text-nexa-text-secondary">
                            {change.label}
                          </span>
                        ))}
                        {preview.changedFields.length > 6 ? (
                          <span className="rounded-full border border-nexa-border px-2 py-1 text-[10px] text-nexa-text-secondary">
                            +{preview.changedFields.length - 6} alan
                          </span>
                        ) : null}
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : null}

              <div className="mt-4 space-y-2">
                {group.products.map((product) => (
                  <div
                    key={product.id}
                    className={`rounded-xl border px-3 py-3 ${
                      product.id === group.suggestedMasterId
                        ? "border-nexa-primary/40 bg-nexa-primary/5"
                        : "border-nexa-border/80 bg-nexa-bg/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-nexa-text">{product.name}</p>
                          {product.id === group.suggestedMasterId ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-nexa-primary/10 px-2 py-1 text-[10px] font-medium text-nexa-primary">
                              <BadgeCheck size={12} />
                              Ana kayıt
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-nexa-text-secondary">
                          {product.source.name}
                          {product.brand ? ` • ${product.brand}` : ""}
                          {product.category ? ` • ${product.category}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-medium ${statusTone(product.status)}`}>
                        {product.status}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-[11px] text-nexa-text-secondary sm:grid-cols-3">
                      <span>Fiyat: {formatCurrency(product.price)}</span>
                      <span>Stok: {product.stock.toLocaleString("tr-TR")}</span>
                      <span>Dış ID: {product.externalId}</span>
                    </div>
                    {typeof product.masterScore === "number" ? (
                      <div className="mt-2 text-[10px] text-nexa-text-secondary">
                        Veri skoru: {product.masterScore}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleApplySuggestedMerge(group)}
                    disabled={processingKey === `${group.field}-${group.value}-merge`}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processingKey === `${group.field}-${group.value}-merge` ? "Birleşiyor..." : "Önerilen merge uygula"}
                  </button>
                  <button
                    onClick={() => handleKeepSuggested(group)}
                    disabled={processingKey === `${group.field}-${group.value}-master`}
                    className="inline-flex items-center gap-2 rounded-lg border border-nexa-primary/30 bg-nexa-primary/10 px-3 py-2 text-xs font-medium text-nexa-primary transition-colors hover:bg-nexa-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processingKey === `${group.field}-${group.value}-master` ? "İşleniyor..." : "Ana kaydı koru"}
                  </button>
                  <button
                    onClick={() => handleExcludeGroup(group)}
                    disabled={processingKey === `${group.field}-${group.value}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-nexa-warning/30 bg-nexa-warning/10 px-3 py-2 text-xs font-medium text-nexa-warning transition-colors hover:bg-nexa-warning/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processingKey === `${group.field}-${group.value}` ? "İşleniyor..." : "Aktifleri hariç tut"}
                  </button>
                  <Link
                    href={`/thyronix/products?search=${encodeURIComponent(group.value)}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-nexa-border px-3 py-2 text-xs font-medium text-nexa-text-secondary transition-colors hover:bg-nexa-hover hover:text-nexa-text"
                  >
                    Ürünlerde aç
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
