"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { Download, ExternalLink, KeyRound, Link2, Search, ShieldCheck } from "lucide-react";

type DigitalLibraryItem = {
  id: string;
  orderId: string;
  orderItemId: string;
  productId: string | null;
  productName: string;
  mode: string;
  modeLabel: string;
  status: string;
  statusLabel: string;
  canAccess: boolean;
  assetName: string;
  assetUrl: string;
  accessInstructions: string;
  licenseValue: string;
  licenseSource: string;
  requiresApproval: boolean;
  downloadLimit: number;
  downloadCount: number;
  deliveredAt: string | null;
  lastAccessedAt: string | null;
  revokedAt: string | null;
  orderNumber: string;
  orderStatus: string;
  orderCreatedAt: string;
  customerName: string;
  dealerName: string;
  logs: Array<{
    id: string;
    eventType: string;
    actorType: string;
    note: string;
    createdAt: string;
  }>;
};

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger"> = {
  active: "success",
  pending: "warning",
  revoked: "danger",
};

export function DigitalLibraryPanel({
  title,
  description,
  orderHrefTemplate,
}: {
  title: string;
  description: string;
  orderHrefTemplate: string;
}) {
  const [items, setItems] = useState<DigitalLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [openingId, setOpeningId] = useState("");

  useEffect(() => {
    fetch("/api/digital-access")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setItems(d.data.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = status === "all" ? true : item.status === status;
      const haystack = [
        item.productName,
        item.orderNumber,
        item.assetName,
        item.modeLabel,
      ].join(" ").toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [items, search, status]);

  const stats = useMemo(() => ({
    active: items.filter((item) => item.status === "active").length,
    pending: items.filter((item) => item.status === "pending").length,
    revoked: items.filter((item) => item.status === "revoked").length,
  }), [items]);

  const openSecureLink = async (grantId: string) => {
    setOpeningId(grantId);
    const res = await fetch(`/api/digital-access/${grantId}/token`, { method: "POST" });
    const data = await res.json();
    if (!data.success) {
      toast.error(data.error || "Erişim linki oluşturulamadı");
      setOpeningId("");
      return;
    }
    window.open(data.data.url, "_blank", "noopener,noreferrer");
    setOpeningId("");
  };

  const resolveOrderHref = (orderId: string) =>
    orderHrefTemplate.includes("{id}") ? orderHrefTemplate.replace("{id}", orderId) : orderHrefTemplate;

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-10 rounded-xl bg-ena-card/40" /><div className="h-56 rounded-xl bg-ena-card/30" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ena-border bg-ena-card/30 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ena-primary">Dijital Ürünler</p>
            <h1 className="mt-1 text-2xl font-bold text-ena-text">{title}</h1>
            <p className="mt-1 text-sm text-ena-light/70">{description}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-xl border border-ena-border bg-black/10 px-4 py-3">
              <p className="text-xs text-ena-light/50">Aktif</p>
              <p className="mt-1 text-lg font-semibold text-emerald-400">{stats.active}</p>
            </div>
            <div className="rounded-xl border border-ena-border bg-black/10 px-4 py-3">
              <p className="text-xs text-ena-light/50">Bekleyen</p>
              <p className="mt-1 text-lg font-semibold text-amber-300">{stats.pending}</p>
            </div>
            <div className="rounded-xl border border-ena-border bg-black/10 px-4 py-3">
              <p className="text-xs text-ena-light/50">Kapalı</p>
              <p className="mt-1 text-lg font-semibold text-rose-300">{stats.revoked}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ena-light/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün adı, sipariş no veya varlık ara"
            className="pl-10"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-ena-border bg-ena-card/40 px-3 py-2.5 text-sm text-ena-text outline-none transition-colors focus:border-ena-primary"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="pending">Bekliyor</option>
          <option value="revoked">Kapalı</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ena-border bg-ena-card/20 p-10 text-center">
          <p className="text-sm text-ena-light/60">Henüz görüntülenecek dijital teslimat yok.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-ena-text">{item.productName}</h2>
                    <Badge variant={STATUS_VARIANT[item.status] || "default"}>{item.statusLabel}</Badge>
                    <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-100">
                      {item.modeLabel}
                    </span>
                  </div>
                  <p className="text-sm text-ena-light/60">
                    Sipariş #{item.orderNumber} • {formatDate(item.orderCreatedAt)}
                  </p>
                  {item.dealerName ? (
                    <p className="text-xs text-ena-light/50">Bayi: {item.dealerName}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={resolveOrderHref(item.orderId)}
                    className="inline-flex items-center gap-2 rounded-xl border border-ena-border bg-black/10 px-3 py-2 text-sm font-medium text-ena-text hover:bg-black/20"
                  >
                    <ExternalLink size={14} /> Siparişi Aç
                  </a>
                  {item.assetUrl && item.canAccess ? (
                    <Button onClick={() => openSecureLink(item.id)} disabled={openingId === item.id} className="gap-2">
                      {item.mode === "external_access" ? <Link2 size={14} /> : <Download size={14} />}
                      {openingId === item.id ? "Hazırlanıyor..." : item.mode === "external_access" ? "Erişimi Aç" : "Güvenli İndir"}
                    </Button>
                  ) : null}
                </div>
              </div>

              {item.accessInstructions ? (
                <div className="mt-4 rounded-xl border border-ena-border bg-black/10 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ena-light/50">Teslim Notu</p>
                  <p className="whitespace-pre-wrap text-sm text-ena-light/80">{item.accessInstructions}</p>
                </div>
              ) : null}

              {item.licenseValue ? (
                <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-200">
                    <KeyRound size={15} /> Lisans / Erişim Bilgisi
                  </div>
                  <p className="whitespace-pre-wrap break-words font-mono text-sm text-white">{item.licenseValue}</p>
                  {item.licenseSource ? (
                    <p className="mt-2 text-xs text-emerald-100/70">Kaynak: {item.licenseSource}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                <InfoMini label="Durum" value={item.statusLabel} />
                <InfoMini label="Erişim" value={item.canAccess ? "Açık" : "Kapalı"} />
                <InfoMini label="İndirme" value={item.downloadLimit > 0 ? `${item.downloadCount}/${item.downloadLimit}` : `${item.downloadCount} kez`} />
                <InfoMini label="Son erişim" value={item.lastAccessedAt ? formatDate(item.lastAccessedAt) : "Yok"} />
              </div>

              {item.requiresApproval ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  <ShieldCheck size={14} /> Bu ürün admin onayı olmadan açılmaz.
                </div>
              ) : null}

              {item.logs.length > 0 ? (
                <div className="mt-4 rounded-xl border border-ena-border bg-black/10 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ena-light/50">Son Hareketler</p>
                  <div className="space-y-2">
                    {item.logs.map((log) => (
                      <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-ena-light/70">{log.note || log.eventType}</span>
                        <span className="text-ena-light/40">{formatDate(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ena-border bg-black/10 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ena-light/45">{label}</p>
      <p className="mt-1 text-sm text-ena-text">{value}</p>
    </div>
  );
}
