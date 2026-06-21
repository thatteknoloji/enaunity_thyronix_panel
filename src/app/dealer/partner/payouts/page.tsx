"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PartnerDealerShell, StatCard } from "@/components/partners/PartnerDealerShell";
import { PAYOUT_STATUS_LABELS } from "@/lib/partners/types";

type Summary = {
  totalEarned: number;
  pendingCommission: number;
  approvedCommission: number;
  paidTotal: number;
  withdrawableBalance: number;
};

type Settings = {
  iban: string;
  accountHolder: string;
  taxIdentityNumber: string;
  payoutMinAmount: number;
  invoiceRequired: boolean;
};

type PayoutRow = {
  id: string;
  amount: number;
  status: string;
  statusLabel: string;
  adminNote: string | null;
  requestedAt: string;
  paidAt: string | null;
  note: string | null;
};

export default function DealerPartnerPayoutsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [form, setForm] = useState({
    iban: "",
    accountHolder: "",
    taxIdentityNumber: "",
    invoiceUrl: "",
    note: "",
    amount: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/dealer/partner/payouts")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSummary(d.data.summary);
          setSettings(d.data.settings);
          setPayouts(d.data.payouts || []);
          setForm((f) => ({
            ...f,
            iban: d.data.settings?.iban || "",
            accountHolder: d.data.settings?.accountHolder || "",
            taxIdentityNumber: d.data.settings?.taxIdentityNumber || "",
            amount: String(d.data.withdrawableBalance ?? ""),
          }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    const r = await fetch("/api/dealer/partner/payout-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        iban: form.iban,
        accountHolder: form.accountHolder,
        taxIdentityNumber: form.taxIdentityNumber,
      }),
    });
    const d = await r.json();
    setSavingSettings(false);
    if (!d.success) {
      toast.error(d.error || "Kayıt başarısız");
      return;
    }
    toast.success("Partner ödeme bilgileri kaydedildi");
    setShowSettings(false);
    load();
  }

  async function createPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!summary || summary.withdrawableBalance <= 0) return;
    setCreating(true);
    const amount = form.amount ? parseFloat(form.amount) : summary.withdrawableBalance;
    const r = await fetch("/api/dealer/partner/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        iban: form.iban,
        accountHolder: form.accountHolder,
        taxIdentityNumber: form.taxIdentityNumber,
        invoiceUrl: form.invoiceUrl || undefined,
        note: form.note || undefined,
      }),
    });
    const d = await r.json();
    setCreating(false);
    if (!d.success) {
      toast.error(d.error || "Talep oluşturulamadı");
      return;
    }
    toast.success("Ödeme talebiniz alındı");
    setShowRequestForm(false);
    load();
  }

  const canWithdraw =
    summary &&
    settings &&
    summary.withdrawableBalance >= settings.payoutMinAmount &&
    settings.iban &&
    settings.accountHolder &&
    (!settings.invoiceRequired || form.invoiceUrl);

  return (
    <PartnerDealerShell title="Ödeme Talepleri" description="Çekilebilir bakiye ve partner ödeme bilgileri">
      {loading ? (
        <p className="text-ena-light text-sm">Yükleniyor…</p>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <StatCard label="Toplam Kazanç" value={`${summary.totalEarned.toFixed(2)} ₺`} />
              <StatCard label="Bekleyen Komisyon" value={`${summary.pendingCommission.toFixed(2)} ₺`} accent="text-amber-400" />
              <StatCard label="Onaylanan Komisyon" value={`${summary.approvedCommission.toFixed(2)} ₺`} />
              <StatCard label="Ödenen Kazanç" value={`${summary.paidTotal.toFixed(2)} ₺`} accent="text-green-400" />
              <StatCard label="Çekilebilir Bakiye" value={`${summary.withdrawableBalance.toFixed(2)} ₺`} accent="text-cyan-400" />
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-lg border border-ena-border px-3 py-2 text-xs text-ena-light hover:text-white"
            >
              Partner Ödeme Bilgileri
            </button>
            <button
              type="button"
              disabled={!canWithdraw}
              onClick={() => {
                if (!settings?.iban) {
                  setShowSettings(true);
                  toast.error("Önce IBAN bilgilerinizi kaydedin");
                  return;
                }
                setShowRequestForm(true);
              }}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Ödeme Talebi Oluştur
            </button>
          </div>

          {settings && summary && summary.withdrawableBalance < settings.payoutMinAmount && summary.withdrawableBalance > 0 && (
            <p className="text-amber-400 text-xs mb-4">
              Minimum ödeme tutarı: {settings.payoutMinAmount.toFixed(2)} ₺
            </p>
          )}

          {showSettings && (
            <form onSubmit={saveSettings} className="rounded-xl border border-ena-border bg-ena-card p-5 mb-6 space-y-3 max-w-lg">
              <h3 className="text-sm font-semibold text-white">Partner Ödeme Bilgileri</h3>
              <label className="block text-xs text-ena-light">
                IBAN (TR…)
                <input
                  required
                  value={form.iban}
                  onChange={(e) => setForm({ ...form, iban: e.target.value })}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white font-mono text-sm"
                />
              </label>
              <label className="block text-xs text-ena-light">
                Hesap sahibi
                <input
                  required
                  value={form.accountHolder}
                  onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white text-sm"
                />
              </label>
              <label className="block text-xs text-ena-light">
                TC / VKN
                <input
                  value={form.taxIdentityNumber}
                  onChange={(e) => setForm({ ...form, taxIdentityNumber: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white text-sm"
                />
              </label>
              <p className="text-xs text-ena-light/60 rounded-lg border border-dashed border-ena-border p-3">
                Fatura / gider pusulası — {settings?.invoiceRequired ? "zorunlu (talep formunda URL girin)" : "gerekirse talep sırasında ekleyin"}
              </p>
              <button type="submit" disabled={savingSettings} className="rounded-lg bg-cyan-600/80 px-4 py-2 text-xs text-white disabled:opacity-50">
                {savingSettings ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </form>
          )}

          {showRequestForm && settings && summary && (
            <form onSubmit={createPayout} className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 mb-6 space-y-3 max-w-lg">
              <h3 className="text-sm font-semibold text-cyan-300">Ödeme Talebi</h3>
              <label className="block text-xs text-ena-light">
                Tutar (₺)
                <input
                  type="number"
                  step="0.01"
                  min={settings.payoutMinAmount}
                  max={summary.withdrawableBalance}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white text-sm"
                />
              </label>
              <p className="text-xs text-ena-light">Çekilebilir: {summary.withdrawableBalance.toFixed(2)} ₺ · Min: {settings.payoutMinAmount.toFixed(2)} ₺</p>
              {settings.invoiceRequired && (
                <label className="block text-xs text-ena-light">
                  Fatura URL *
                  <input
                    required
                    value={form.invoiceUrl}
                    onChange={(e) => setForm({ ...form, invoiceUrl: e.target.value })}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white text-sm"
                  />
                </label>
              )}
              <label className="block text-xs text-ena-light">
                Not
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-white text-sm"
                />
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={creating} className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  {creating ? "Gönderiliyor…" : "Talebi Gönder"}
                </button>
                <button type="button" onClick={() => setShowRequestForm(false)} className="text-xs text-ena-light hover:text-white">
                  İptal
                </button>
              </div>
            </form>
          )}

          <h3 className="text-sm font-semibold text-white mb-2">Talep Geçmişi</h3>
          <div className="rounded-xl border border-ena-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ena-card text-xs text-ena-light uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Tarih</th>
                  <th className="px-4 py-2 text-left">Tutar</th>
                  <th className="px-4 py-2 text-left">Durum</th>
                  <th className="px-4 py-2 text-left hidden sm:table-cell">Admin notu</th>
                  <th className="px-4 py-2 text-left hidden sm:table-cell">Ödeme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ena-border">
                {payouts.map((p) => (
                  <tr key={p.id} className="bg-ena-card/50">
                    <td className="px-4 py-3 text-ena-light text-xs">
                      {new Date(p.requestedAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-400">{p.amount.toFixed(2)} ₺</td>
                    <td className="px-4 py-3 text-xs">{p.statusLabel || PAYOUT_STATUS_LABELS[p.status]}</td>
                    <td className="px-4 py-3 text-xs text-ena-light hidden sm:table-cell">{p.adminNote || "—"}</td>
                    <td className="px-4 py-3 text-xs text-ena-light hidden sm:table-cell">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString("tr-TR") : "—"}
                    </td>
                  </tr>
                ))}
                {!payouts.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-ena-light text-sm">
                      Henüz ödeme talebi yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PartnerDealerShell>
  );
}
