"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Check, X, ExternalLink, Download, Eye, Search, ChevronDown, Store } from "lucide-react";

interface Application {
  id: string;
  partnerType: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  location: string;
  companySize: string;
  markets: string;
  portfolio: string;
  techLevel: string;
  motivation: string;
  files: string;
  kvkk: boolean;
  status: string;
  createdAt: string;
}

const partnerTypeLabels: Record<string, string> = {
  affiliate: "Satış Ortağı (Affiliate)",
  bayii: "Bayi (B2B)",
  partner: "Çözüm Ortağı",
  developer: "Geliştirici",
};

const typeColors: Record<string, string> = {
  affiliate: "bg-blue-100 text-blue-700",
  bayii: "bg-purple-100 text-purple-700",
  partner: "bg-emerald-100 text-emerald-700",
  developer: "bg-amber-100 text-amber-700",
};

const statusColors: Record<string, "default" | "success" | "warning" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

export default function PartnerApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/partner-applications")
      .then((r) => r.json())
      .then((d) => setApplications(d.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/partner-applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchApplications();
  };

  const filtered = applications.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.company.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesType = typeFilter === "all" || a.partnerType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const parsedFiles = (files: string): { name: string; url: string }[] => {
    try {
      return JSON.parse(files);
    } catch {
      return [];
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">İş Ortaklığı Başvuruları</h1>
          <p className="text-sm text-gray-500 mt-1">Toplam {applications.length} başvuru</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="İsim, şirket veya e-posta ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-0"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-gray-400 focus:outline-none"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="pending">Beklemede</option>
          <option value="approved">Onaylandı</option>
          <option value="rejected">Reddedildi</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-gray-400 focus:outline-none"
        >
          <option value="all">Tüm Tipler</option>
          {Object.entries(partnerTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <Users size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">Başvuru bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[app.partnerType] || "bg-gray-100 text-gray-700"}`}>
                      {partnerTypeLabels[app.partnerType] || app.partnerType}
                    </span>
                    <Badge variant={statusColors[app.status] || "default"}>
                      {statusLabels[app.status] || app.status}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900">{app.name}</h3>
                  <p className="text-sm text-gray-600">{app.title} &middot; {app.company}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                    <span>{app.email}</span>
                    <span>{app.phone}</span>
                    <span>{app.location}</span>
                    <span>{app.companySize} çalışan</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(app.createdAt)}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(selected?.id === app.id ? null : app)}
                    className="text-gray-500"
                    title="Detay"
                  >
                    <Eye size={15} />
                  </Button>
                  {app.status === "pending" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus(app.id, "approved")}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Onayla"
                      >
                        <Check size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus(app.id, "rejected")}
                        className="text-ena-primary hover:text-ena-primary hover:bg-ena-primary/5"
                        title="Reddet"
                      >
                        <X size={15} />
                      </Button>
                    </>
                  )}
                  <ChevronDown
                    size={15}
                    className={`text-gray-400 transition-transform ${selected?.id === app.id ? "rotate-180" : ""}`}
                  />
                </div>
              </div>

              {selected?.id === app.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Hedef Pazarlar</p>
                      <p className="text-gray-800">{app.markets}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Website</p>
                      {app.website ? (
                        <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          {app.website} <ExternalLink size={10} />
                        </a>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Teknoloji Seviyesi</p>
                      <p className="text-gray-800">{app.techLevel || "-"}</p>
                    </div>
                  </div>

                  {app.motivation && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Başvuru Nedeni</p>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{app.motivation}</p>
                    </div>
                  )}

                  {app.portfolio && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Portföy / Referanslar</p>
                      <p className="text-sm text-gray-700">{app.portfolio}</p>
                    </div>
                  )}

                  {parsedFiles(app.files).length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Yüklenen Belgeler ({parsedFiles(app.files).length})</p>
                      <div className="flex flex-wrap gap-2">
                        {parsedFiles(app.files).map((file, i) => (
                          <a
                            key={i}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Download size={12} />
                            {file.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
