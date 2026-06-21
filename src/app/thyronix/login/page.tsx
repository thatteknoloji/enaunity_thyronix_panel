"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isPlatformAdmin, establishAdminProductSession } from "@/lib/product-auth/admin-bypass";
import {
  Loader2, Zap, Lock, ArrowRight, Activity, Server, Database, Radio,
} from "lucide-react";

const easeOut = "cubic-bezier(0.23, 1, 0.32, 1)";

function AnimatedLogo() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);
  return (
    <svg width="42" height="42" viewBox="0 0 28 28" fill="none" className="shrink-0"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1) rotate(0deg)" : "scale(0.5) rotate(-90deg)",
        transition: "opacity 700ms cubic-bezier(0.23,1,0.32,1), transform 700ms cubic-bezier(0.23,1,0.32,1)",
      }}>
      <rect width="28" height="28" rx="6" fill="#2388FF" />
      <path d="M8 20V10L14 8L20 10V20L14 22L8 20Z" fill="#0B0F19" />
      <rect x="12" y="12" width="4" height="6" rx="1" fill="#2388FF" />
    </svg>
  );
}

function DotGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0;
    const dots: { x: number; y: number; r: number; phase: number }[] = [];
    let frame = 0, animId = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const init = () => {
      resize(); dots.length = 0;
      const spacing = 70;
      for (let r = 0; r < Math.ceil(h / spacing) + 1; r++)
        for (let c = 0; c < Math.ceil(w / spacing) + 1; c++)
          dots.push({ x: c * spacing, y: r * spacing, r: 0.5 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 });
    };
    const draw = () => {
      frame++; ctx.clearRect(0, 0, w, h);
      const time = frame * 0.01;
      for (const d of dots) {
        const wave = Math.sin(time * 0.4 + d.phase) * 8;
        const waveY = Math.cos(time * 0.35 + d.phase) * 8;
        const alpha = 0.05 + Math.sin(time * 0.6 + d.phase) * 0.025;
        ctx.beginPath(); ctx.arc(d.x + wave, d.y + waveY, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(35,136,255,${alpha})`; ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    init(); draw();
    const onResize = () => init();
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(animId); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} aria-hidden="true" />;
}

function StatCounter({ value, label, delay }: { value: number; label: string; delay: number }) {
  const [display, setDisplay] = useState(0);
  const hasRun = useRef(false);
  useEffect(() => {
    if (hasRun.current) return; hasRun.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 2400, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => requestAnimationFrame(tick), delay + 600);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return (
    <div className="text-center">
      <p className="text-[26px] font-bold text-nexa-text tabular-nums leading-none tracking-tight">{display.toLocaleString("tr-TR")}</p>
      <p className="text-[11px] text-nexa-text-secondary mt-1.5 font-medium tracking-wide uppercase">{label}</p>
    </div>
  );
}

function FeatureItem({ icon: Icon, label, desc, delay }: { icon: React.ElementType; label: string; desc: string; delay: number }) {
  return (
    <div className="flex items-start gap-3" style={{ opacity: 0, transform: "translateX(-24px)", animation: `slideFeatureIn 700ms ${easeOut} both`, animationDelay: `${delay}ms`, animationFillMode: "both" }}>
      <div className="w-8 h-8 rounded-lg bg-nexa-primary/10 flex items-center justify-center shrink-0"><Icon size={15} className="text-nexa-primary" /></div>
      <div><p className="text-sm font-semibold text-nexa-text">{label}</p><p className="text-xs text-nexa-text-secondary/80 mt-0.5 leading-relaxed">{desc}</p></div>
    </div>
  );
}

export default function ThyronixLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [stats, setStats] = useState({ products: 0, sources: 0, feeds: 0 });

  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 50);
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    if (email) setForm((f) => ({ ...f, email }));
    fetch("/api/thyronix/stats/public").then((r) => r.json()).then((d) => {
      if (d.success && d.data) setStats(d.data);
    });
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const productRes = await fetch("/api/product-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, productType: "THYRONIX" }),
      });
      const productData = await productRes.json();

      if (productRes.ok && productData.success) {
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get("redirect") || productData.data.redirectTo || "/thyronix";
        window.location.href = redirectTo;
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(productData.error || data.error || "Giriş yapılamadı");
        setLoading(false);
        return;
      }
      if (data.data.role !== "admin" && !isPlatformAdmin(data.data.role)) {
        if (data.data.role === "dealer" && data.data.dealerId) {
          const cp = await fetch("/api/customer-products");
          const cj = await cp.json();
          const thy = cj.success
            ? cj.data.products.find((p: { moduleKey: string; status: string }) => p.moduleKey === "THYRONIX")
            : null;
          if (thy && (thy.status === "ACTIVE" || thy.status === "TRIAL")) {
            const params = new URLSearchParams(window.location.search);
            window.location.href = params.get("redirect") || "/thyronix";
            return;
          }
          window.location.href = "/gateway/thyronix";
          return;
        }
        setError("THYRONIX hesabınız bulunamadı. Önce ENA üzerinden hesap bağlantısı oluşturun.");
        setLoading(false);
        return;
      }

      await establishAdminProductSession("THYRONIX");

      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirect") || "/thyronix";
      window.location.href = redirectTo;
    } catch {
      setError("Sunucuya bağlanılamadı");
      setLoading(false);
    }
  };

  const bgPolygons = [
    { top: "8%", left: "3%", w: 340, h: 340, op: 0.07, clr: "#2388FF", d: 4 },
    { top: "60%", left: "78%", w: 420, h: 420, op: 0.06, clr: "#4F46E5", d: 5 },
    { top: "15%", left: "55%", w: 240, h: 240, op: 0.05, clr: "#10B981", d: 6 },
    { top: "75%", left: "15%", w: 300, h: 300, op: 0.06, clr: "#F59E0B", d: 7 },
    { bottom: "10%", left: "35%", w: 380, h: 380, op: 0.05, clr: "#2388FF", d: 8 },
    { top: "0%", right: "20%", w: 200, h: 200, op: 0.06, clr: "#4F46E5", d: 3 },
  ];

  return (
    <div className="min-h-screen flex bg-nexa-bg relative overflow-hidden">
      <DotGridBackground />
      {bgPolygons.map((p, i) => (
        <div key={i} className="absolute rounded-full blur-[100px] pointer-events-none animate-float-drift" aria-hidden="true"
          style={{ width: p.w, height: p.h, top: p.top, left: p.left, right: p.right, bottom: p.bottom, backgroundColor: p.clr, opacity: p.op, filter: `blur(${p.d * 28}px)`, animationDelay: `${i * 2.5}s` }} />
      ))}

      <div className="hidden lg:flex flex-col justify-between w-[520px] bg-nexa-card/80 backdrop-blur-sm border-r border-nexa-border p-14 relative z-10"
        style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateX(0)" : "translateX(-40px)", transition: `opacity 800ms ${easeOut}, transform 800ms ${easeOut}` }}>
        <div>
          <div className="flex items-center gap-3 mb-10" style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(-16px)", transition: `opacity 600ms ${easeOut} 150ms, transform 600ms ${easeOut} 150ms` }}>
            <AnimatedLogo />
            <span className="text-xl font-bold text-nexa-text tracking-tight">THYRONIX</span>
          </div>
          <h1 className="text-[34px] font-bold text-nexa-text leading-[1.15] mb-3 tracking-tight">
            <span style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(12px)", transition: `opacity 600ms ${easeOut} 300ms, transform 600ms ${easeOut} 300ms`, display: "inline-block" }}>Product</span>{" "}
            <span style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(12px)", transition: `opacity 600ms ${easeOut} 420ms, transform 600ms ${easeOut} 420ms`, display: "inline-block" }}>Feed</span><br />
            <span className="text-nexa-primary" style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(12px)", transition: `opacity 600ms ${easeOut} 540ms, transform 600ms ${easeOut} 540ms`, display: "inline-block" }}>Infrastructure</span>
          </h1>
          <p className="text-nexa-text-secondary/80 text-sm leading-relaxed max-w-xs mb-12"
            style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(12px)", transition: `opacity 600ms ${easeOut} 650ms, transform 600ms ${easeOut} 650ms` }}>
            XML kaynaklarını yönet, ürünleri birleştir, kurallarla işle ve sabit feed olarak yayınla.
          </p>
          <div className="space-y-5">
            <FeatureItem icon={Server} label="Multi-XML Engine" desc="Sınırsız XML/CSV/JSON/API kaynağı, akıllı eşleştirme" delay={800} />
            <FeatureItem icon={GitBranch} label="Rule Engine" desc="IF/THEN mantığında otomatik işleme ve filtreleme" delay={950} />
            <FeatureItem icon={Radio} label="Feed Engine" desc="Sabit URL ile kesintisiz multi-platform yayınlama" delay={1100} />
          </div>
          <div className="mt-12 flex items-center gap-3 px-4 py-3 rounded-xl bg-nexa-bg/50 border border-nexa-border/50"
            style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(12px)", transition: `opacity 600ms ${easeOut} 1250ms, transform 600ms ${easeOut} 1250ms` }}>
            <Activity size={14} className="text-nexa-success animate-dot-pulse shrink-0" />
            <div><p className="text-xs text-nexa-text-secondary">Sistem durumu</p><p className="text-xs font-medium text-nexa-success">Tüm servisler aktif</p></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-8 border-t border-nexa-border/50"
          style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(12px)", transition: `opacity 600ms ${easeOut} 1400ms, transform 600ms ${easeOut} 1400ms` }}>
          <StatCounter value={stats.products} label="Ürün" delay={1600} />
          <StatCounter value={stats.sources} label="Kaynak" delay={1800} />
          <StatCounter value={stats.feeds} label="Feed" delay={2000} />
        </div>
        <div className="flex items-center gap-3" style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(8px)", transition: `opacity 600ms ${easeOut} 2100ms, transform 600ms ${easeOut} 2100ms` }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0 opacity-30"><rect width="28" height="28" rx="6" fill="#2388FF" /><path d="M8 20V10L14 8L20 10V20L14 22L8 20Z" fill="#0B0F19" /><rect x="12" y="12" width="4" height="6" rx="1" fill="#2388FF" /></svg>
          <span className="text-[11px] text-nexa-text-secondary/50 font-medium tracking-wider">MERGE · SYNC · PUBLISH</span>
        </div>
        <div className="text-[10px] text-nexa-text-secondary/30 mt-6">© 2026 Thyronix® · Powered by <a href="https://thatteknoloji.com" target="_blank" rel="noopener noreferrer" className="text-nexa-text-secondary/40 hover:text-nexa-primary/50 transition-colors">ThatTeknoloji®</a></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative z-10"
        style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(24px)", transition: `opacity 800ms ${easeOut} 200ms, transform 800ms ${easeOut} 200ms` }}>
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-3 mb-10" style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(-10px)", transition: `opacity 600ms ${easeOut} 150ms, transform 600ms ${easeOut} 150ms` }}>
            <AnimatedLogo /><span className="text-xl font-bold text-nexa-text">THYRONIX</span>
          </div>
          <div className="mb-9" style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(10px)", transition: `opacity 600ms ${easeOut} 350ms, transform 600ms ${easeOut} 350ms` }}>
            <h2 className="text-2xl font-bold text-nexa-text">Giriş Yap</h2>
            <p className="mt-2 text-sm text-nexa-text-secondary/80">THYRONIX paneline erişmek için giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(10px)", transition: `opacity 600ms ${easeOut} 450ms, transform 600ms ${easeOut} 450ms` }}>
              <label htmlFor="email" className="block text-xs font-medium text-nexa-text-secondary/80 mb-2">E-posta</label>
              <div className="relative group">
                <input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="thyronix@thyronix.com" required disabled={loading} autoComplete="email"
                  className="w-full px-4 py-3 bg-nexa-card border border-nexa-border rounded-xl text-sm text-nexa-text placeholder:text-nexa-text-secondary/30 focus:outline-none focus:border-nexa-primary/60 focus:ring-2 focus:ring-nexa-primary/15 transition-all duration-300" />
              </div>
            </div>
            <div style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(10px)", transition: `opacity 600ms ${easeOut} 520ms, transform 600ms ${easeOut} 520ms` }}>
              <label htmlFor="password" className="block text-xs font-medium text-nexa-text-secondary/80 mb-2">Şifre</label>
              <div className="relative group">
                <input id="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required disabled={loading} autoComplete="current-password"
                  className="w-full px-4 py-3 bg-nexa-card border border-nexa-border rounded-xl text-sm text-nexa-text placeholder:text-nexa-text-secondary/30 focus:outline-none focus:border-nexa-primary/60 focus:ring-2 focus:ring-nexa-primary/15 transition-all duration-300" />
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-nexa-danger/8 border border-nexa-danger/20" style={{ animation: `scaleIn 300ms ${easeOut} both` }}>
                <p className="text-xs text-nexa-danger/90 flex items-center gap-2 font-medium"><Lock size={12} className="shrink-0" />{error}</p>
              </div>
            )}

            <div className="relative pt-2" style={{ opacity: pageReady ? 1 : 0, transform: pageReady ? "translateY(0)" : "translateY(16px)", transition: `opacity 600ms ${easeOut} 600ms, transform 600ms ${easeOut} 600ms` }}>
              <button type="submit" disabled={loading}
                className="relative w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-gradient-to-r from-nexa-primary via-blue-600 to-nexa-secondary text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-nexa-primary/25 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed animate-gradient-shift">
                {loading ? <><Loader2 size={16} className="animate-spin" />Giriş yapılıyor...</> : <><Zap size={16} />Giriş Yap</>}
              </button>
            </div>

            <div className="text-center pt-2" style={{ opacity: pageReady ? 1 : 0, transition: `opacity 600ms ${easeOut} 700ms` }}>
              <span className="text-[10px] text-nexa-text-secondary/50 font-medium tracking-wide">THYRONIX Product Feed Infrastructure v1.0</span>
            </div>
          </form>

          <div className="lg:hidden text-center mt-8 text-[10px] text-nexa-text-secondary/30">
            © 2026 Thyronix® · Powered by <a href="https://thatteknoloji.com" target="_blank" rel="noopener noreferrer" className="text-nexa-text-secondary/40 hover:text-nexa-primary/50 transition-colors">ThatTeknoloji®</a>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nexa-border/30 to-transparent z-10 pointer-events-none" aria-hidden="true" />
    </div>
  );
}

function GitBranch({ size, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 6v4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 8h10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
