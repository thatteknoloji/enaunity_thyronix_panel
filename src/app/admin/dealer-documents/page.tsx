"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DOC_TYPE_LABELS } from "@/components/account/nav";
import {
  Upload,
  FileText,
  Store,
  CheckCircle,
  XCircle,
  Download,
  Search,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { toAdminUrl } from "@/lib/auth/admin-access";

interface DealerDoc {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  status: string;
  adminNote: string;
  createdAt: string;
  dealer: { id: string; name: string; company: string; email: string };
}

const STATUS_VARIANT: Record<string, "default" | "success" | "danger" | "warning"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const STATUS_TEXT: Record<string, string> = {
  pending: "Onay Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDealerDocumentsPage() {
  const [docs, setDocs] = useState<DealerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const fetchDocs = () => {
    setLoading(true);
    fetch("/api/admin/dealer-documents")
      .then((r) => r.json())
      .then((d) => setDocs(d.data || []))
      .catch(() => toast.error("Evraklar yüklenemedi"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const filtered = useMemo(() => {
    return docs.filter((doc) => {
      if (statusFilter !== "all" && doc.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.dealer.company.toLowerCase().includes(q) ||
        doc.dealer.name.toLowerCase().includes(q) ||
        doc.dealer.email.toLowerCase().includes(q) ||
        (DOC_TYPE_LABELS[doc.type] || doc.type).toLowerCase().includes(q)
      );
    });
  }, [docs, search, statusFilter]);

  const counts = useMemo(
    () => ({
      all: docs.length,
      pending: docs.filter((d) => d.status === "pending").length,
      approved: docs.filter((d) => d.status === "approved").length,
      rejected: docs.filter((d) => d.status === "rejected").length,
    }),
    [docs]
  );

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/dealer-documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: adminNotes[id] || "" }),
      });
      if (res.ok) {
        toast.success(status === "approved" ? "Evrak onaylandı" : "Evrak reddedildi");
        fetchDocs();
      } else {
        toast.error("İşlem başarısız");
      }
    } catch {
      toast.error("İşlem başarısız");
    }
    setActing(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Upload size={24} /> Bayi Evrakları
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Bayilerin yüklediği vergi levhası, imza sirküleri ve diğer evrakları inceleyin.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { key: "all", label: "Toplam", count: counts.all, color: "text-gray-700" },
          { key: "pending", label: "Bekleyen", count: counts.pending, color: "text-amber-700" },
          { key: "approved", label: "Onaylı", count: counts.approved, color: "text-emerald-700" },
          { key: "rejected", label: "Red", count: counts.rejected, color: "text-red-700" },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStatusFilter(s.key)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              statusFilter === s.key
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-gray-400"
            placeholder="Bayi, firma, evrak adı ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link
          href={toAdminUrl("/admin/dealers")}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          <Store size={15} /> Bayi Listesi
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <FileText size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">
            {docs.length === 0
              ? "Henüz bayi evrakı yüklenmemiş"
              : "Filtreye uygun evrak bulunamadı"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Bayiler evraklarını hesap sayfasından yükler.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((doc) => (
            <div key={doc.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 shrink-0">
                      <FileText size={18} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant={STATUS_VARIANT[doc.status] || "default"}>
                          {STATUS_TEXT[doc.status] || doc.status}
                        </Badge>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={11} /> {formatDate(doc.createdAt)}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 truncate">{doc.title || doc.fileName}</p>
                      <p className="text-sm text-gray-600">
                        {DOC_TYPE_LABELS[doc.type] || doc.type} · {formatSize(doc.fileSize)}
                        {doc.fileName && doc.fileName !== doc.title ? ` · ${doc.fileName}` : ""}
                      </p>
                      <p className="text-sm text-indigo-600 flex items-center gap-1 mt-1 truncate">
                        <Store size={12} />
                        {doc.dealer.company || "—"} — {doc.dealer.name}
                        <span className="text-gray-400">({doc.dealer.email})</span>
                      </p>
                      {doc.status === "rejected" && doc.adminNote && (
                        <p className="text-xs text-red-600 mt-2 bg-red-50 rounded px-2 py-1 inline-block">
                          Red notu: {doc.adminNote}
                        </p>
                      )}
                    </div>
                  </div>

                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 shrink-0"
                  >
                    <Download size={14} /> İndir / Görüntüle
                  </a>
                </div>

                {doc.status === "pending" && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Admin Notu (red durumunda bayiye gösterilir)
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-3"
                      rows={2}
                      placeholder="Opsiyonel açıklama..."
                      value={adminNotes[doc.id] ?? ""}
                      onChange={(e) =>
                        setAdminNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))
                      }
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(doc.id, "approved")}
                        disabled={acting === doc.id}
                        className="gap-1"
                      >
                        <CheckCircle size={14} /> Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(doc.id, "rejected")}
                        disabled={acting === doc.id}
                        className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle size={14} /> Reddet
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
