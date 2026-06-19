"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      if (!d.success) {
        toast.error(d.error || "İşlem başarısız");
        return;
      }
      setSent(true);
      toast.success(d.message);
    } catch {
      toast.error("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ena-text">Şifremi Unuttum</h1>
          <p className="mt-2 text-sm text-ena-light">Kayıtlı e-posta adresinize sıfırlama bağlantısı gönderilir.</p>
        </div>

        {sent ? (
          <div className="acc-card p-4 text-sm text-ena-light text-center">
            Talebiniz alındı. E-posta kayıtlıysa birkaç dakika içinde bağlantı gelir.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-posta"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Gönderiliyor...</> : "Sıfırlama Bağlantısı Gönder"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-ena-light">
          <Link href="/auth/login" className="text-ena-primary hover:underline">Giriş sayfasına dön</Link>
        </p>
      </div>
    </div>
  );
}
