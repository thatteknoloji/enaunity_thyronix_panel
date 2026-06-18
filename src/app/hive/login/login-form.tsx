"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Sparkles, Lock } from "lucide-react";
import { isPlatformAdmin, establishAdminProductSession } from "@/lib/product-auth/admin-bypass";

export default function HiveLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const email = searchParams.get("email");
    if (email) setForm((f) => ({ ...f, email }));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/product-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, productType: "HIVE" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const redirectTo = searchParams.get("redirect") || data.data.redirectTo || "/hive";
        window.location.href = redirectTo;
        return;
      }

      const authRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const authData = await authRes.json();
      if (!authRes.ok) {
        setError(data.error || authData.error || "Giriş yapılamadı");
        setLoading(false);
        return;
      }
      if (!isPlatformAdmin(authData.data?.role)) {
        setError("HIVE hesabınız bulunamadı. Önce ENA gateway üzerinden bağlantı oluşturun.");
        setLoading(false);
        return;
      }

      await establishAdminProductSession("HIVE");
      const redirectTo = searchParams.get("redirect") || "/hive";
      window.location.href = redirectTo;
    } catch {
      setError("Sunucuya bağlanılamadı");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ena-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-violet-500/20 bg-ena-card p-8 space-y-5">
        <div className="text-center">
          <Sparkles className="mx-auto text-violet-400 mb-3" size={36} />
          <h1 className="text-xl font-bold text-white">HIVE Giriş</h1>
          <p className="text-sm text-ena-light mt-1">HIVE bağımsız giriş ekranı</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <Lock size={12} /> {error}
            </div>
          )}
          <div>
            <label className="text-xs text-ena-light mb-1 block">E-posta</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-ena-light mb-1 block">Şifre</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Giriş Yap
          </button>
        </form>

        <p className="text-[10px] text-ena-light/60 text-center">
          Platform yöneticileri ENA şifresi ile giriş yapabilir. Bayiler için{" "}
          <button type="button" onClick={() => router.push("/gateway/hive")} className="text-violet-400 hover:underline">
            ENA gateway
          </button>.
        </p>
      </div>
    </div>
  );
}
