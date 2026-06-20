"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    company: "",
    taxNumber: "",
    taxOffice: "",
    kvkkAccepted: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kayıt yapılamadı");
        toast.error(data.error || "Kayıt yapılamadı");
        return;
      }

      setSubmitted(true);
      toast.success("Başvurunuz alındı");
    } catch {
      setError("Sunucuya bağlanılamadı");
      toast.error("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-black text-ena-text">Başvurunuz Alındı</h1>
          <p className="text-sm text-ena-light leading-relaxed">
            B4B üyelik başvurunuz admin ekibimize iletildi. 8 koşul kontrol edildikten sonra onaylanırsınız.
            Onay sonrası e-posta adresinizle giriş yapabilirsiniz.
          </p>
          <Link href="/auth/login">
            <Button className="mt-4">Giriş Sayfasına Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-ena-text">B4B Üyelik Başvurusu</h1>
          <p className="mt-2 text-sm text-ena-light">Bilgilerinizi doldurun, admin onayından sonra hesabınız aktif olur</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            label="Ad Soyad *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={loading}
          />
          <Input
            id="email"
            label="E-posta *"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={loading}
          />
          <Input
            id="password"
            label="Şifre *"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            disabled={loading}
          />
          <Input
            id="phone"
            label="Telefon"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            disabled={loading}
          />
          <Input
            id="company"
            label="Firma / Ünvan"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            disabled={loading}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="taxNumber"
              label="Vergi No"
              value={form.taxNumber}
              onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
              disabled={loading}
            />
            <Input
              id="taxOffice"
              label="Vergi Dairesi"
              value={form.taxOffice}
              onChange={(e) => setForm({ ...form, taxOffice: e.target.value })}
              disabled={loading}
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-ena-light cursor-pointer">
            <input
              type="checkbox"
              checked={form.kvkkAccepted}
              onChange={(e) => setForm({ ...form, kvkkAccepted: e.target.checked })}
              className="mt-1 rounded border-ena-border"
              required
            />
            <span>
              KVKK aydınlatma metnini okudum ve kabul ediyorum.{" "}
              <Link href="/contracts/kvkk-aydinlatma-metni" className="text-ena-primary hover:underline" target="_blank">
                Metni oku
              </Link>
            </span>
          </label>

          {error && <p className="text-sm text-ena-primary bg-red-400/10 rounded p-2">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" /> Gönderiliyor…
              </>
            ) : (
              "Başvuruyu Gönder"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-ena-light">
          Zaten hesabın var mı?{" "}
          <Link href="/auth/login" className="font-medium text-ena-primary hover:text-ena-primary transition-colors">
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}
