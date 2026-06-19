"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccCard, AccPageTitle, AccSkeleton } from "@/components/account/AccountShell";
import { Key, LogOut, Mail, Shield, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";

type SecurityInfo = {
  email: string;
  name: string;
  totpEnabled: boolean;
  isSubUser: boolean;
  role: string;
  hasDealerAccount: boolean;
};

export function SecurityTab({ onLogout }: { onLogout: () => void }) {
  const [info, setInfo] = useState<SecurityInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const [totpSetup, setTotpSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpBusy, setTotpBusy] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/auth/security")
      .then((r) => r.json())
      .then((d) => { if (d.success) setInfo(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pwForm),
      });
      const d = await res.json();
      if (!d.success) {
        toast.error(d.error || "Şifre güncellenemedi");
        return;
      }
      toast.success("Şifreniz güncellendi");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setPwSaving(false);
    }
  };

  const startTotp = async () => {
    setTotpBusy(true);
    try {
      const res = await fetch("/api/auth/totp", { method: "POST" });
      const d = await res.json();
      if (!d.success) {
        toast.error(d.error || "2FA kurulumu başlatılamadı");
        return;
      }
      setTotpSetup(d.data);
      setTotpCode("");
    } finally {
      setTotpBusy(false);
    }
  };

  const enableTotp = async () => {
    setTotpBusy(true);
    try {
      const res = await fetch("/api/auth/totp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });
      const d = await res.json();
      if (!d.success) {
        toast.error(d.error || "Doğrulama başarısız");
        return;
      }
      toast.success("2FA etkinleştirildi");
      setTotpSetup(null);
      setTotpCode("");
      load();
    } finally {
      setTotpBusy(false);
    }
  };

  const disableTotp = async () => {
    setTotpBusy(true);
    try {
      const res = await fetch("/api/auth/totp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });
      const d = await res.json();
      if (!d.success) {
        toast.error(d.error || "2FA kapatılamadı");
        return;
      }
      toast.success("2FA kapatıldı");
      setDisableCode("");
      load();
    } finally {
      setTotpBusy(false);
    }
  };

  if (loading) return <AccSkeleton rows={5} />;

  return (
    <div className="space-y-4">
      <AccPageTitle title="Güvenlik Ayarları" description="Şifre, iki faktörlü doğrulama ve oturum yönetimi" />

      <AccCard>
        <div className="flex items-start gap-3">
          <Mail size={18} className="text-ena-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-ena-text">Hesap Bilgileri</h3>
            <p className="text-sm text-ena-light mt-1">E-posta: <span className="text-ena-text">{info?.email}</span></p>
            <p className="text-sm text-ena-light">Rol: <span className="text-ena-text">{info?.role}</span></p>
          </div>
        </div>
      </AccCard>

      <AccCard>
        <div className="flex items-center gap-2 mb-3">
          <Key size={16} className="text-ena-primary" />
          <h3 className="text-sm font-semibold text-ena-text">Şifre Değiştir</h3>
        </div>
        <form onSubmit={changePassword} className="space-y-3 max-w-md">
          <Input
            label="Mevcut şifre"
            type="password"
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            required
          />
          <Input
            label="Yeni şifre"
            type="password"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            required
            minLength={8}
          />
          <Input
            label="Yeni şifre (tekrar)"
            type="password"
            value={pwForm.confirmPassword}
            onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
            required
            minLength={8}
          />
          <Button type="submit" size="sm" disabled={pwSaving}>
            {pwSaving ? <><Loader2 size={14} className="mr-1 animate-spin" /> Kaydediliyor...</> : "Şifreyi Güncelle"}
          </Button>
        </form>
        <p className="text-xs text-ena-light/70 mt-3">
          Şifrenizi mi unuttunuz?{" "}
          <Link href="/auth/forgot-password" className="text-ena-primary hover:underline">
            Sıfırlama bağlantısı isteyin
          </Link>
        </p>
      </AccCard>

      <AccCard>
        <div className="flex items-center gap-2 mb-3">
          {info?.totpEnabled ? <ShieldCheck size={16} className="text-nexa-success" /> : <Shield size={16} className="text-ena-primary" />}
          <h3 className="text-sm font-semibold text-ena-text">İki Faktörlü Doğrulama (2FA)</h3>
        </div>

        {info?.totpEnabled ? (
          <div className="space-y-3 max-w-md">
            <p className="text-sm text-ena-light">Hesabınızda 2FA aktif. Giriş yaparken authenticator uygulamasındaki kodu girmeniz gerekir.</p>
            <Input
              label="Kapatmak için doğrulama kodu"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="6 haneli kod"
              maxLength={6}
            />
            <Button variant="outline" size="sm" onClick={disableTotp} disabled={totpBusy || disableCode.length < 6}>
              <ShieldOff size={14} className="mr-1" /> 2FA&apos;yı Kapat
            </Button>
          </div>
        ) : totpSetup ? (
          <div className="space-y-3 max-w-lg">
            <p className="text-sm text-ena-light">Google Authenticator, Authy veya benzeri bir uygulamaya aşağıdaki anahtarı ekleyin:</p>
            <code className="block text-xs bg-ena-dark/50 border border-ena-border rounded p-3 break-all text-ena-text">{totpSetup.secret}</code>
            <p className="text-xs text-ena-light/60 break-all">{totpSetup.uri}</p>
            <Input
              label="Uygulamadaki 6 haneli kod"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={enableTotp} disabled={totpBusy || totpCode.length !== 6}>
                Etkinleştir
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setTotpSetup(null)}>İptal</Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-ena-light mb-3">Ek güvenlik katmanı ekleyin. Girişte şifreye ek olarak tek kullanımlık kod istenir.</p>
            <Button size="sm" onClick={startTotp} disabled={totpBusy}>
              2FA Kurulumunu Başlat
            </Button>
          </div>
        )}
      </AccCard>

      <AccCard>
        <h3 className="text-sm font-semibold text-ena-text mb-2">Oturum</h3>
        <p className="text-sm text-ena-light mb-3">Şüpheli aktivite fark ederseniz çıkış yapın ve şifrenizi güncelleyin.</p>
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut size={14} className="mr-1" /> Tüm Oturumları Kapat
        </Button>
      </AccCard>
    </div>
  );
}
