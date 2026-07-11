"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { PartnerAdminShell } from "@/components/partners/PartnerAdminShell";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { PAYOUT_STATUS_LABELS } from "@/lib/partners/types";

export default function AdminPartnerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [rules, setRules] = useState({ payoutMinAmount: "", invoiceRequired: false });

  const load = () => {
    fetch(`/api/admin/partners/${id}`).then((r) => r.json()).then((d) => {
      if (d.success) {
        setData(d.data);
        const s = d.data.settings as { payoutMinAmount: number; invoiceRequired: boolean };
        setRules({
          payoutMinAmount: String(s.payoutMinAmount),
          invoiceRequired: s.invoiceRequired,
        });
      }
    });
  };

  useEffect(load, [id]);

  async function saveRules() {
    const r = await fetch(`/api/admin/partners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_payout_rules",
        payoutMinAmount: parseFloat(rules.payoutMinAmount),
        invoiceRequired: rules.invoiceRequired,
      }),
    });
    const d = await r.json();
    if (!d.success) toast.error(d.error);
    else {
      toast.success("Payout kuralları güncellendi");
      load();
    }
  }

  if (!data) {
    return (
      <PartnerAdminShell title="Partner Detay" backHref="/admin/partners">
        <p className="text-gray-400 text-sm">Yükleniyor…</p>
      </PartnerAdminShell>
    );
  }

  const profile = data.profile as Record<string, unknown>;
  const user = data.user as { name: string; email: string; phone: string } | null;
  const summary = data.summary as Record<string, number>;
  const settings = data.settings as Record<string, unknown>;
  const payouts = (data.payouts || []) as Array<Record<string, unknown>>;

  return (
    <PartnerAdminShell title="Partner Detay" backHref="/admin/partners">
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <div className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Partner Bilgileri</h3>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between"><dt className="text-gray-500">Ad</dt><dd>{user?.name || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">E-posta</dt><dd>{user?.email}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Referans kodu</dt><dd className="font-mono">{String(profile.referralCode)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Tip</dt><dd>{String(data.partnerTypeLabel)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Durum</dt><dd>{String(profile.status)}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Komisyon Oranları</h3>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between"><dt className="text-gray-500">Modül</dt><dd>%{((profile.moduleCommissionRate as number) * 100).toFixed(1)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">POD</dt><dd>%{((profile.podCommissionRate as number) * 100).toFixed(1)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Ağ override</dt><dd>%{((profile.networkOverrideRate as number) * 100).toFixed(1)}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Kazanç Özeti</h3>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between"><dt className="text-gray-500">Toplam kazanç</dt><dd>{summary.totalEarned.toFixed(2)} ₺</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Çekilebilir</dt><dd className="text-cyan-600 font-semibold">{summary.withdrawableBalance.toFixed(2)} ₺</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Ödenen</dt><dd>{summary.paidTotal.toFixed(2)} ₺</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Payout Ayarları</h3>
          <dl className="text-sm space-y-1 mb-4">
            <div className="flex justify-between"><dt className="text-gray-500">IBAN</dt><dd className="font-mono text-xs">{String(settings.iban || "—")}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Hesap sahibi</dt><dd>{String(settings.accountHolder || "—")}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">TC/VKN</dt><dd>{String(settings.taxIdentityNumber || "—")}</dd></div>
          </dl>
          <div className="space-y-2 border-t pt-3">
            <label className="block text-xs text-gray-500">
              Minimum ödeme (₺)
              <input
                type="number"
                value={rules.payoutMinAmount}
                onChange={(e) => setRules({ ...rules, payoutMinAmount: e.target.value })}
                className="mt-1 w-full border rounded px-2 py-1 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={rules.invoiceRequired} onChange={(e) => setRules({ ...rules, invoiceRequired: e.target.checked })} />
              Fatura zorunlu
            </label>
            <button type="button" onClick={saveRules} className="text-xs text-blue-600 hover:underline">Kuralları kaydet</button>
          </div>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-700 mb-2">Payout Geçmişi</h3>
      <table className="w-full text-sm rounded-xl border bg-white overflow-hidden mb-4">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr><th className="px-4 py-2 text-left">Tarih</th><th className="px-4 py-2 text-left">Tutar</th><th className="px-4 py-2 text-left">Durum</th></tr>
        </thead>
        <tbody className="divide-y">
          {payouts.map((p) => (
            <tr key={String(p.id)}>
              <td className="px-4 py-2 text-xs">{new Date(String(p.requestedAt)).toLocaleDateString("tr-TR")}</td>
              <td className="px-4 py-2">{(p.amount as number).toFixed(2)} ₺</td>
              <td className="px-4 py-2 text-xs">{PAYOUT_STATUS_LABELS[String(p.status)] || String(p.status)}</td>
            </tr>
          ))}
          {!payouts.length && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Payout yok</td></tr>}
        </tbody>
      </table>

      <Link href={toAdminUrl("/admin/partners/payouts")} className="text-sm text-blue-600 hover:underline">
        Tüm ödeme talepleri →
      </Link>
    </PartnerAdminShell>
  );
}
