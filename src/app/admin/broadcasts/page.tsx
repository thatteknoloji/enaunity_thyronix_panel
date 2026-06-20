"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Calendar, Mail, Megaphone, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

type Campaign = {
  id: string;
  title: string;
  message: string;
  channel: string;
  audience: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  deliveredCount: number;
  emailSentCount: number;
  createdAt: string;
  createdByName: string;
};

const CHANNELS = [
  { value: "panel_and_email", label: "Panel + E-posta" },
  { value: "panel_only", label: "Sadece panel bildirimi" },
  { value: "email_only", label: "Sadece e-posta" },
];

const AUDIENCES = [
  { value: "all", label: "Herkes" },
  { value: "members", label: "Sadece üyeler" },
  { value: "dealers", label: "Sadece bayiler" },
  { value: "custom", label: "Özel (e-posta / bayi ID)" },
];

export default function AdminBroadcastsPage() {
  const [tab, setTab] = useState<"compose" | "scheduled" | "history">("compose");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    emailSubject: "",
    emailHtml: "",
    channel: "panel_and_email",
    audience: "all",
    link: "",
    type: "announcement",
    scheduledAt: "",
    customEmails: "",
    customDealerIds: "",
    requireCommercialConsent: false,
  });

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/notification-campaigns")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCampaigns(d.data || []); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const audienceFilter = () => {
    const filter: Record<string, unknown> = {};
    if (form.audience === "custom") {
      const emails = form.customEmails.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
      const dealerIds = form.customDealerIds.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
      if (emails.length) filter.userIds = emails;
      if (dealerIds.length) filter.dealerIds = dealerIds;
    }
    if (form.requireCommercialConsent) filter.requireCommercialConsent = true;
    return filter;
  };

  const submit = async (sendNow: boolean) => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Başlık ve mesaj gerekli");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/notification-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        emailSubject: form.emailSubject || form.title,
        audienceFilter: audienceFilter(),
        sendNow,
        scheduledAt: !sendNow && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.success) {
      toast.success(sendNow ? "Bildirim gönderildi" : form.scheduledAt ? "Zamanlandı" : "Taslak kaydedildi");
      setForm({ ...form, title: "", message: "", emailSubject: "", emailHtml: "", scheduledAt: "" });
      load();
      setTab("history");
    } else toast.error(d.error || "Hata");
  };

  const sendExisting = async (id: string) => {
    if (!confirm("Bu kampanyayı şimdi gönder?")) return;
    const res = await fetch(`/api/admin/notification-campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_now" }),
    });
    const d = await res.json();
    if (d.success) { toast.success("Gönderildi"); load(); }
    else toast.error(d.error || "Hata");
  };

  const scheduled = campaigns.filter((c) => c.status === "scheduled" || c.status === "draft");
  const history = campaigns.filter((c) => c.status === "sent" || c.status === "cancelled");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone size={24} /> Bildirim Yayınları
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Üye/bayi paneline bildirim · e-posta · zamanlama · otomatik abonelik uyarıları cron ile çalışır (Europe/Istanbul)
          </p>
        </div>
        <Link href="/admin/notifications" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
          <Bell size={14} /> Admin gelen kutusu
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["compose", "Yeni Yayın"],
          ["scheduled", "Zamanlanmış / Taslak"],
          ["history", "Geçmiş"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "compose" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="text-gray-600">Kanal</span>
              <select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-gray-600">Hedef kitle</span>
              <select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </label>
          </div>

          {form.audience === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-sm">
                <span className="text-gray-600">Bayi ID (virgülle)</span>
                <textarea className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={2} value={form.customDealerIds} onChange={(e) => setForm({ ...form, customDealerIds: e.target.value })} />
              </label>
              <label className="text-sm">
                <span className="text-gray-600">Kullanıcı ID (virgülle)</span>
                <textarea className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={2} value={form.customEmails} onChange={(e) => setForm({ ...form, customEmails: e.target.value })} />
              </label>
            </div>
          )}

          <label className="text-sm block">
            <span className="text-gray-600">Başlık</span>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="text-sm block">
            <span className="text-gray-600">Panel mesajı</span>
            <textarea className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </label>
          {(form.channel === "email_only" || form.channel === "panel_and_email") && (
            <>
              <label className="text-sm block">
                <span className="text-gray-600">E-posta konusu</span>
                <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.emailSubject} onChange={(e) => setForm({ ...form, emailSubject: e.target.value })} placeholder={form.title || "Konu"} />
              </label>
              <label className="text-sm block">
                <span className="text-gray-600">E-posta HTML (boş = panel mesajı)</span>
                <textarea className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono text-xs" rows={4} value={form.emailHtml} onChange={(e) => setForm({ ...form, emailHtml: e.target.value })} />
              </label>
            </>
          )}
          <label className="text-sm block">
            <span className="text-gray-600">Panel link (opsiyonel)</span>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/dealer/orders" />
          </label>
          <label className="text-sm block">
            <span className="text-gray-600">Zamanla (Europe/Istanbul)</span>
            <input type="datetime-local" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.requireCommercialConsent} onChange={(e) => setForm({ ...form, requireCommercialConsent: e.target.checked })} />
            Pazarlama içeriği — sadece ticari ileti onayı verenlere e-posta
          </label>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button disabled={saving} onClick={() => submit(true)} className="gap-1"><Send size={14} /> Hemen Gönder</Button>
            <Button disabled={saving} variant="outline" onClick={() => submit(false)} className="gap-1">
              <Calendar size={14} /> {form.scheduledAt ? "Zamanla" : "Taslak Kaydet"}
            </Button>
          </div>
        </div>
      )}

      {(tab === "scheduled" || tab === "history") && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-gray-400">Yükleniyor…</p>
          ) : (tab === "scheduled" ? scheduled : history).length === 0 ? (
            <p className="p-8 text-center text-gray-400">Kayıt yok</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50"><th className="px-4 py-3 text-left">Başlık</th><th className="px-4 py-3 text-left">Hedef</th><th className="px-4 py-3 text-left">Durum</th><th className="px-4 py-3 text-left">Tarih</th><th className="px-4 py-3" /></tr></thead>
              <tbody className="divide-y">
                {(tab === "scheduled" ? scheduled : history).map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">{c.message}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{c.audience} · {c.channel}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{c.status}</span>
                      {c.status === "sent" && (
                        <p className="text-[10px] text-gray-400 mt-1">{c.deliveredCount}/{c.recipientCount} panel · {c.emailSentCount} mail</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {c.sentAt ? formatDate(c.sentAt) : c.scheduledAt ? formatDate(c.scheduledAt) : formatDate(c.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(c.status === "draft" || c.status === "scheduled") && (
                        <button onClick={() => sendExisting(c.id)} className="text-xs text-emerald-600 hover:underline">Gönder</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-900">
        <p className="font-semibold flex items-center gap-2"><Users size={16} /> Otomatik bildirimler</p>
        <ul className="mt-2 space-y-1 text-blue-800/90 list-disc pl-5">
          <li>Modül abonelikleri: 30 gün, 15 gün, son gün — panel + e-posta</li>
          <li>Yenileme yoksa: +3 gün pasif · +7 gün engel · +15 gün veri silme</li>
          <li>Zamanlanmış yayınlar cron (<code>/api/cron/payment-deadlines</code>) ile işlenir</li>
        </ul>
      </div>
    </div>
  );
}
