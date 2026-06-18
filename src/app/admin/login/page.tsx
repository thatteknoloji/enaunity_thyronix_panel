"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { getAdminSecretPath, isAdminRole } from "@/lib/auth/admin-access";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError("Email ve şifre gerekli");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || "Giriş başarısız"); setLoading(false); return; }

      // Verify admin role
      const me = await fetch("/api/auth/me");
      const meData = await me.json();
      if (!isAdminRole(meData.data?.role)) {
        await fetch("/api/auth/login", { method: "DELETE" });
        setError("Bu alana erişim yetkiniz yok. Sadece yetkili yöneticiler giriş yapabilir.");
        setLoading(false);
        return;
      }

      router.push(getAdminSecretPath());
    } catch {
      setError("Bağlantı hatası");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Yönetici Girişi</h1>
          <p className="text-sm text-gray-400">Yetkili personel girişi</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-2xl bg-[#111] border border-white/5 p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400 text-xs">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/30"
              placeholder="admin@enaunity.com.tr" autoComplete="email" autoFocus />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Şifre</label>
            <div className="relative">
              <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/30 pr-10"
                placeholder="••••••••" autoComplete="current-password" />
              <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Shield size={16}/>}
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>

          <p className="text-[10px] text-gray-500 text-center pt-2">
            Bu alan sadece yetkili sistem yöneticileri içindir. Yetkisiz erişim kayıt altına alınır.
          </p>
        </form>
      </div>
    </div>
  );
}
