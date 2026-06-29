"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Save, Shield, Wallet, Zap, Unlock } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { AdminFormField, AdminFormSelect } from "@/components/admin/AdminFormField";
import toast from "react-hot-toast";

type Tab = "general" | "esnekpos" | "iyzico" | "balance";

interface BalanceFormState {
  enabled: boolean;
  minAmount: number;
  presets: string;
  belowMinMessage: string;
  splitEnabled: boolean;
  bankTransferEnabled: boolean;
  pendingMessage: string;
}

const BALANCE_DEFAULT: BalanceFormState = {
  enabled: true,
  minAmount: 5000,
  presets: "5000,10000,20000",
  belowMinMessage: "Minimum bakiye yükleme tutarı 5.000 ₺'dir.",
  splitEnabled: true,
  bankTransferEnabled: true,
  pendingMessage: "Havale onayı genellikle 1-2 iş günü sürer.",
};

interface FormState {
  bankTransferEnabled: boolean;
  activeCardProvider: string;
  checkoutTitle: string;
  checkoutDescription: string;
  require3ds: boolean;
  esnekposEnabled: boolean;
  esnekposSandbox: boolean;
  esnekposMerchantId: string;
  esnekposMerchantKey: string;
  esnekposExtraFeePct: number;
  esnekposExtraFeeFix: number;
  esnekposInstallments: boolean;
  esnekposMaxInstall: number;
  esnekposMinAmount: number;
  esnekposDisplayName: string;
  iyzicoEnabled: boolean;
  iyzicoSandbox: boolean;
  iyzicoApiKey: string;
  iyzicoSecretKey: string;
  iyzicoExtraFeePct: number;
  iyzicoExtraFeeFix: number;
  iyzicoInstallments: boolean;
  iyzicoMaxInstall: number;
  iyzicoMinAmount: number;
  iyzicoDisplayName: string;
}

const DEFAULT: FormState = {
  bankTransferEnabled: true,
  activeCardProvider: "NONE",
  checkoutTitle: "Ödeme",
  checkoutDescription: "",
  require3ds: true,
  esnekposEnabled: false,
  esnekposSandbox: true,
  esnekposMerchantId: "",
  esnekposMerchantKey: "",
  esnekposExtraFeePct: 0,
  esnekposExtraFeeFix: 0,
  esnekposInstallments: false,
  esnekposMaxInstall: 1,
  esnekposMinAmount: 0,
  esnekposDisplayName: "EsnekPOS",
  iyzicoEnabled: false,
  iyzicoSandbox: true,
  iyzicoApiKey: "",
  iyzicoSecretKey: "",
  iyzicoExtraFeePct: 0,
  iyzicoExtraFeeFix: 0,
  iyzicoInstallments: false,
  iyzicoMaxInstall: 1,
  iyzicoMinAmount: 0,
  iyzicoDisplayName: "İyzico",
};

export default function PaymentGatewaysAdminPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [balanceForm, setBalanceForm] = useState<BalanceFormState>(BALANCE_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBalance, setSavingBalance] = useState(false);
  const [openingAll, setOpeningAll] = useState(false);
  const [envHint, setEnvHint] = useState({ esnek: false, iyzico: false });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/payments/gateways").then((r) => r.json()),
      fetch("/api/admin/payments/balance-settings").then((r) => r.json()),
    ])
      .then(([gw, bal]) => {
        if (gw.success) {
        const raw = gw.data.raw || {};
        setForm({
          ...DEFAULT,
          bankTransferEnabled: gw.data.bankTransferEnabled,
          activeCardProvider: gw.data.activeCardProvider,
          checkoutTitle: gw.data.checkoutTitle,
          checkoutDescription: gw.data.checkoutDescription,
          require3ds: gw.data.require3ds,
          esnekposEnabled: raw.esnekposEnabled ?? gw.data.esnekpos.enabled,
          esnekposSandbox: raw.esnekposSandbox ?? gw.data.esnekpos.sandbox,
          esnekposMerchantId: gw.data.esnekposMerchantId || "",
          esnekposMerchantKey: "",
          esnekposExtraFeePct: raw.esnekposExtraFeePct ?? 0,
          esnekposExtraFeeFix: raw.esnekposExtraFeeFix ?? 0,
          esnekposInstallments: raw.esnekposInstallments ?? false,
          esnekposMaxInstall: raw.esnekposMaxInstall ?? 1,
          esnekposMinAmount: raw.esnekposMinAmount ?? 0,
          esnekposDisplayName: raw.esnekposDisplayName ?? "EsnekPOS",
          iyzicoEnabled: raw.iyzicoEnabled ?? gw.data.iyzico.enabled,
          iyzicoSandbox: raw.iyzicoSandbox ?? gw.data.iyzico.sandbox,
          iyzicoApiKey: gw.data.iyzicoApiKey || "",
          iyzicoSecretKey: "",
          iyzicoExtraFeePct: raw.iyzicoExtraFeePct ?? 0,
          iyzicoExtraFeeFix: raw.iyzicoExtraFeeFix ?? 0,
          iyzicoInstallments: raw.iyzicoInstallments ?? false,
          iyzicoMaxInstall: raw.iyzicoMaxInstall ?? 1,
          iyzicoMinAmount: raw.iyzicoMinAmount ?? 0,
          iyzicoDisplayName: raw.iyzicoDisplayName ?? "İyzico",
        });
        setEnvHint({ esnek: gw.data.envEsnekpos, iyzico: gw.data.envIyzico });
        }
        if (bal.success && bal.data) {
          setBalanceForm({
            enabled: bal.data.enabled ?? true,
            minAmount: bal.data.minAmount ?? 5000,
            presets: (bal.data.presets || [5000, 10000, 20000]).join(","),
            belowMinMessage: bal.data.belowMinMessage || BALANCE_DEFAULT.belowMinMessage,
            splitEnabled: bal.data.splitEnabled ?? true,
            bankTransferEnabled: bal.data.bankTransferEnabled ?? true,
            pendingMessage: bal.data.pendingMessage || BALANCE_DEFAULT.pendingMessage,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));

  const updateBalance = (patch: Partial<BalanceFormState>) => setBalanceForm((p) => ({ ...p, ...patch }));

  const saveBalance = async () => {
    setSavingBalance(true);
    try {
      const presets = balanceForm.presets
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n > 0);
      const r = await fetch("/api/admin/payments/balance-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...balanceForm,
          presets: presets.length ? presets : [5000, 10000, 20000],
        }),
      });
      const d = await r.json();
      if (d.success) toast.success("Bakiye ayarları kaydedildi");
      else toast.error(d.error || "Kaydedilemedi");
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setSavingBalance(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.esnekposMerchantKey?.trim()) delete payload.esnekposMerchantKey;
      if (!payload.iyzicoSecretKey?.trim()) delete payload.iyzicoSecretKey;
      if (payload.esnekposEnabled && payload.activeCardProvider === "NONE") {
        payload.activeCardProvider = "ESNEKPOS";
      } else if (payload.iyzicoEnabled && payload.activeCardProvider === "NONE") {
        payload.activeCardProvider = "IYZICO";
      }
      const r = await fetch("/api/admin/payments/gateways", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.success) toast.success("Ödeme ayarları kaydedildi");
      else toast.error(d.error || "Kaydedilemedi");
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const openAllPaymentMethods = async () => {
    if (!confirm("Tüm bayiler için kart, havale ve bakiye ödemesi açılacak. Grup/bayi engelleri kaldırılacak. Devam?")) {
      return;
    }
    setOpeningAll(true);
    try {
      const r = await fetch("/api/admin/payments/ensure-open", { method: "POST" });
      const d = await r.json();
      if (!d.success) {
        toast.error(d.error || "Açılamadı");
        return;
      }
      toast.success(d.data?.message || "Tüm ödeme yöntemleri açıldı");
      setForm((p) => ({
        ...p,
        bankTransferEnabled: true,
        esnekposEnabled: p.esnekposEnabled || d.data?.gateway?.esnekposConfigured,
        activeCardProvider:
          d.data?.gateway?.activeCardProvider !== "NONE"
            ? d.data.gateway.activeCardProvider
            : p.activeCardProvider,
      }));
      setBalanceForm((p) => ({
        ...p,
        enabled: true,
        splitEnabled: true,
        bankTransferEnabled: true,
      }));
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setOpeningAll(false);
    }
  };

  const previewMethods = useMemo(() => {
    const m: string[] = [];
    if (form.bankTransferEnabled) m.push("Havale / EFT");
    if (form.esnekposEnabled && (form.esnekposMerchantId || form.activeCardProvider === "ESNEKPOS")) {
      m.push(form.esnekposDisplayName);
    }
    if (form.iyzicoEnabled && (form.iyzicoApiKey || form.activeCardProvider === "IYZICO")) {
      m.push(form.iyzicoDisplayName);
    }
    return m;
  }, [form]);

  if (loading) return <div className="text-center py-16 text-gray-400">Yükleniyor...</div>;

  const tabs: { key: Tab; label: string; icon: typeof CreditCard }[] = [
    { key: "general", label: "Genel", icon: Shield },
    { key: "esnekpos", label: "EsnekPOS", icon: Zap },
    { key: "iyzico", label: "İyzico", icon: CreditCard },
    { key: "balance", label: "Bakiye", icon: Wallet },
  ];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={toAdminUrl("/admin/payments")} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ödeme Altyapısı</h1>
            <p className="text-sm text-gray-500">EsnekPOS / İyzico — aktif sağlayıcı, komisyon, taksit</p>
          </div>
        </div>
        <button
          type="button"
          onClick={tab === "balance" ? saveBalance : save}
          disabled={tab === "balance" ? savingBalance : saving}
          className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg flex items-center gap-1 disabled:opacity-50"
        >
          <Save size={14} /> {tab === "balance" ? (savingBalance ? "Kaydediliyor..." : "Bakiye Ayarlarını Kaydet") : saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-6 text-sm text-emerald-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-semibold">Bayi ödeme engeli mi var?</p>
          <p className="text-emerald-800 text-xs mt-1">
            Kart, havale ve bakiye ödemesini tüm bayiler için tek tıkla açın. Grup/bayi bazlı kapatma politikaları temizlenir.
          </p>
        </div>
        <button
          type="button"
          onClick={openAllPaymentMethods}
          disabled={openingAll}
          className="shrink-0 px-4 py-2 text-sm bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50 hover:bg-emerald-800"
        >
          <Unlock size={14} /> {openingAll ? "Açılıyor..." : "Tüm Ödeme Yöntemlerini Aç"}
        </button>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 mb-6 text-sm text-blue-900">
        <p className="font-semibold mb-1">Aktif kart sağlayıcısı: tek seçim</p>
        <p className="text-blue-800 text-xs">
          Hangisini aktif edersen müşteri panelinde yalnızca o görünür. Admin panelden kaydettiğiniz Merchant ID / Key önceliklidir; <code className="bg-white/60 px-1 rounded">.env</code> yalnızca DB boşken kullanılır.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {previewMethods.map((m) => (
            <span key={m} className="text-xs px-2 py-1 rounded-full bg-white border border-blue-200">{m}</span>
          ))}
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 ${
              tab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        {tab === "general" && (
          <>
            <p className="text-xs text-gray-500">
              Gelişmiş bayi/grup politikaları için{" "}
              <Link href={toAdminUrl("/admin/payments/policies")} className="text-gray-900 underline">
                Ödeme Politikaları
              </Link>{" "}
              sayfasını kullanın (Sipariş &amp; Finans menüsünde).
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={form.bankTransferEnabled} onChange={(e) => update({ bankTransferEnabled: e.target.checked })} />
              Havale / EFT aktif
            </label>
            <AdminFormSelect
              label="Aktif Kart Sağlayıcısı"
              value={form.activeCardProvider}
              onChange={(v) => update({ activeCardProvider: v })}
              options={[
                { value: "NONE", label: "Kapalı (sadece havale)" },
                { value: "ESNEKPOS", label: "EsnekPOS" },
                { value: "IYZICO", label: "İyzico" },
              ]}
            />
            <AdminFormField label="Ödeme Ekranı Başlığı" value={form.checkoutTitle} onChange={(v) => update({ checkoutTitle: v })} />
            <AdminFormField label="Ödeme Ekranı Açıklaması" value={form.checkoutDescription} onChange={(v) => update({ checkoutDescription: v })} multiline />
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={form.require3ds} onChange={(e) => update({ require3ds: e.target.checked })} />
              3D Secure zorunlu (sağlayıcı destekliyorsa)
            </label>
          </>
        )}

        {tab === "esnekpos" && (
          <>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <strong>Merchant ID</strong> = EsnekPOS panelindeki domain (ör. <code>enaunity.com.tr/</code>) — Public Token değil.
            </p>
            {envHint.esnek && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">ESNEKPOS_ENABLED=true — .env aktif</p>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.esnekposEnabled} onChange={(e) => update({ esnekposEnabled: e.target.checked })} /> EsnekPOS aktif</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.esnekposSandbox} onChange={(e) => update({ esnekposSandbox: e.target.checked })} /> Sandbox modu</label>
            <AdminFormField label="Görünen Ad" value={form.esnekposDisplayName} onChange={(v) => update({ esnekposDisplayName: v })} />
            <AdminFormField label="Merchant ID (domain)" value={form.esnekposMerchantId} onChange={(v) => update({ esnekposMerchantId: v })} placeholder="enaunity.com.tr/" />
            <AdminFormField label="Merchant Key / Secret" value={form.esnekposMerchantKey} onChange={(v) => update({ esnekposMerchantKey: v })} placeholder="Boş bırak = değiştirme" />
            <div className="grid md:grid-cols-2 gap-4">
              <AdminFormField label="Ek Ücret (%)" value={String(form.esnekposExtraFeePct)} onChange={(v) => update({ esnekposExtraFeePct: parseFloat(v) || 0 })} />
              <AdminFormField label="Ek Ücret (₺ sabit)" value={String(form.esnekposExtraFeeFix)} onChange={(v) => update({ esnekposExtraFeeFix: parseFloat(v) || 0 })} />
              <AdminFormField label="Min. tutar (₺)" value={String(form.esnekposMinAmount)} onChange={(v) => update({ esnekposMinAmount: parseFloat(v) || 0 })} />
              <AdminFormField label="Max taksit" value={String(form.esnekposMaxInstall)} onChange={(v) => update({ esnekposMaxInstall: parseInt(v) || 1 })} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.esnekposInstallments} onChange={(e) => update({ esnekposInstallments: e.target.checked })} /> Taksit seçenekleri açık</label>
          </>
        )}

        {tab === "iyzico" && (
          <>
            {envHint.iyzico && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">IYZICO_ENABLED=true — .env aktif</p>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.iyzicoEnabled} onChange={(e) => update({ iyzicoEnabled: e.target.checked })} /> İyzico aktif</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.iyzicoSandbox} onChange={(e) => update({ iyzicoSandbox: e.target.checked })} /> Sandbox modu</label>
            <AdminFormField label="Görünen Ad" value={form.iyzicoDisplayName} onChange={(v) => update({ iyzicoDisplayName: v })} />
            <AdminFormField label="API Key" value={form.iyzicoApiKey} onChange={(v) => update({ iyzicoApiKey: v })} />
            <AdminFormField label="Secret Key" value={form.iyzicoSecretKey} onChange={(v) => update({ iyzicoSecretKey: v })} placeholder="Boş bırak = değiştirme" />
            <div className="grid md:grid-cols-2 gap-4">
              <AdminFormField label="Ek Ücret (%)" value={String(form.iyzicoExtraFeePct)} onChange={(v) => update({ iyzicoExtraFeePct: parseFloat(v) || 0 })} />
              <AdminFormField label="Ek Ücret (₺ sabit)" value={String(form.iyzicoExtraFeeFix)} onChange={(v) => update({ iyzicoExtraFeeFix: parseFloat(v) || 0 })} />
              <AdminFormField label="Min. tutar (₺)" value={String(form.iyzicoMinAmount)} onChange={(v) => update({ iyzicoMinAmount: parseFloat(v) || 0 })} />
              <AdminFormField label="Max taksit" value={String(form.iyzicoMaxInstall)} onChange={(v) => update({ iyzicoMaxInstall: parseInt(v) || 1 })} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.iyzicoInstallments} onChange={(e) => update({ iyzicoInstallments: e.target.checked })} /> Taksit seçenekleri açık</label>
          </>
        )}

        {tab === "balance" && (
          <>
            <p className="text-xs text-gray-500">
              Bayi bakiye yükleme ve checkout&apos;ta bölünmüş ödeme kuralları. Kart top-up için EsnekPOS sekmesinde credential gerekir.
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={balanceForm.enabled} onChange={(e) => updateBalance({ enabled: e.target.checked })} />
              Bakiye yükleme aktif
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={balanceForm.splitEnabled} onChange={(e) => updateBalance({ splitEnabled: e.target.checked })} />
              Bölünmüş ödeme (bakiye + kart) aktif
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={balanceForm.bankTransferEnabled} onChange={(e) => updateBalance({ bankTransferEnabled: e.target.checked })} />
              Havale ile bakiye yükleme aktif
            </label>
            <AdminFormField label="Minimum yükleme tutarı (₺)" value={String(balanceForm.minAmount)} onChange={(v) => updateBalance({ minAmount: parseFloat(v) || 0 })} />
            <AdminFormField label="Hızlı tutarlar (virgülle)" value={balanceForm.presets} onChange={(v) => updateBalance({ presets: v })} placeholder="5000,10000,20000" />
            <AdminFormField label="Min. tutar altı mesaj" value={balanceForm.belowMinMessage} onChange={(v) => updateBalance({ belowMinMessage: v })} multiline />
            <AdminFormField label="Havale bekleme mesajı" value={balanceForm.pendingMessage} onChange={(v) => updateBalance({ pendingMessage: v })} multiline />
          </>
        )}
      </div>
    </div>
  );
}
