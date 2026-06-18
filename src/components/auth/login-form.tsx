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

      toast.success(`Hoş geldin, ${data.data.name}`);
      window.location.href = redirectTo;
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
