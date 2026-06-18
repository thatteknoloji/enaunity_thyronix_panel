"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      toast.success(`Hoş geldin, ${data.data.name}`);
      window.location.href = "/";
    } catch {
      setError("Sunucuya bağlanılamadı");
      toast.error("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-black text-ena-text">Kayıt Ol</h1>
          <p className="mt-2 text-sm text-ena-light">Hesap oluştur, alışverişin tadını çıkar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="name"
            label="Ad Soyad"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={loading}
          />
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

          {error && <p className="text-sm text-ena-primary bg-red-400/10 rounded p-2">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Kayıt yapılıyor...</> : "Kayıt Ol"}
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
