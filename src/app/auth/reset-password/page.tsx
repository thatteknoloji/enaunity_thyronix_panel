"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Loader2 } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const isSubUser = searchParams.get("sub") === "1";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Geçersiz bağlantı");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword, isSubUser }),
      });
      const d = await res.json();
      if (!d.success) {
        toast.error(d.error || "Şifre güncellenemedi");
        return;
      }
      setDone(true);
      toast.success(d.message);
    } catch {
      toast.error("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center text-sm text-ena-light">
        Geçersiz sıfırlama bağlantısı. <Link href="/auth/forgot-password" className="text-ena-primary">Yeni talep oluşturun</Link>.
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-ena-light">Şifreniz güncellendi.</p>
        <Link href="/auth/login"><Button className="w-full">Giriş Yap</Button></Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordInput label="Yeni şifre" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} disabled={loading} autoComplete="new-password" />
      <PasswordInput label="Yeni şifre (tekrar)" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} disabled={loading} autoComplete="new-password" />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Kaydediliyor...</> : "Şifreyi Güncelle"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ena-text">Yeni Şifre Belirle</h1>
        </div>
        <Suspense fallback={<div className="acc-skeleton h-32" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
