"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Loader2 } from "lucide-react";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_oauth_red: "Google ile giriş yapılırken bir hata oluştu.",
  google_config: "Google OAuth yapılandırılmamış.",
  google_token: "Google token alınamadı.",
  google_profile: "Google profil bilgileri alınamadı.",
  google_email_exists: "Bu e-posta ile kayıtlı bir hesap var. Lütfen şifrenizle giriş yapın.",
  google_server: "Sunucu hatası. Lütfen tekrar deneyin.",
};

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    const err = searchParams.get("error");
    if (err && GOOGLE_ERROR_MESSAGES[err]) {
      setError(GOOGLE_ERROR_MESSAGES[err]);
      toast.error(GOOGLE_ERROR_MESSAGES[err]);
    }
  }, [searchParams]);
  const [loading, setLoading] = useState(false);
  const [twoFA, setTwoFA] = useState<{ challenge: string; name: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const finishLogin = (data: { name: string; role?: string; status?: string }) => {
    toast.success(`Hoş geldin, ${data.name}`);
    if (data.role === "user" && (data.status === "pending" || data.status === "rejected")) {
      window.location.href = "/account/application";
      return;
    }
    window.location.href = redirectTo;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Giriş yapılamadı");
        toast.error(data.error || "Giriş yapılamadı");
        return;
      }

      if (data.requires2FA) {
        setTwoFA({ challenge: data.challenge, name: data.data.name });
        return;
      }

      finishLogin(data.data);
    } catch {
      setError("Sunucuya bağlanılamadı");
      toast.error("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFA) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge: twoFA.challenge, code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Doğrulama başarısız");
        toast.error(data.error || "Doğrulama başarısız");
        return;
      }
      finishLogin(data.data);
    } catch {
      setError("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  };

  if (twoFA) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-black text-ena-text">2FA Doğrulama</h1>
            <p className="mt-2 text-sm text-ena-light">Merhaba {twoFA.name}, authenticator kodunuzu girin</p>
          </div>
          <form onSubmit={verify2FA} className="space-y-5">
            <Input
              id="totp"
              label="6 haneli kod"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              disabled={loading}
              maxLength={6}
            />
            {error && <p className="text-sm text-ena-primary bg-red-400/10 rounded p-2">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
              {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Doğrulanıyor...</> : "Doğrula ve Giriş Yap"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => { setTwoFA(null); setTotpCode(""); }}>
              Geri
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-black text-ena-text">Giriş Yap</h1>
          <p className="mt-2 text-sm text-ena-light">Hesabına giriş yap, alışverişe başla</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="email"
            label="E-posta"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={loading}
          />
          <PasswordInput
            id="password"
            label="Şifre"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            disabled={loading}
            autoComplete="current-password"
          />

          <div className="text-right">
            <Link href="/auth/forgot-password" className="text-xs text-ena-primary hover:underline">
              Şifremi unuttum
            </Link>
          </div>

          {error && <p className="text-sm text-ena-primary bg-red-400/10 rounded p-2">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Giriş yapılıyor...</> : "Giriş Yap"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-ena-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-ena-light">veya</span>
          </div>
        </div>

        <a
          href="/api/auth/oauth/google/start"
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-ena-border bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google ile Giriş Yap
        </a>

        <p className="text-center text-sm text-ena-light">
          Hesabın yok mu?{" "}
          <Link href="/auth/register" className="font-medium text-ena-primary hover:text-ena-primary transition-colors">
            Kayıt Ol
          </Link>
        </p>
      </div>
    </div>
  );
}
