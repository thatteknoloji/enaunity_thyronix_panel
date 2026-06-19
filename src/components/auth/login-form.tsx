"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [twoFA, setTwoFA] = useState<{ challenge: string; name: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const finishLogin = (data: { name: string }) => {
    toast.success(`Hoş geldin, ${data.name}`);
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
          <Input
            id="password"
            label="Şifre"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            disabled={loading}
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
