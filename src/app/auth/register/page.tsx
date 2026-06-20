"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { MEMBER_DOCUMENT_LABELS, MEMBER_REQUIRED_DOCUMENTS } from "@/lib/members/checklist";
import { REGISTRATION_OPTIONAL_SLUGS, REGISTRATION_REQUIRED_SLUGS } from "@/lib/legal/constants";

const CONTRACT_UI: Record<string, { title: string; required: boolean }> = {
  "kvkk-aydinlatma-metni": { title: "KVKK Aydınlatma Metni", required: true },
  "gizlilik-politikasi": { title: "Gizlilik Politikası", required: true },
  "cerez-politikasi": { title: "Çerez Politikası", required: true },
  "uyelik-sozlesmesi": { title: "Üyelik ve Platform Kullanım Sözleşmesi", required: true },
  "ticari-elektronik-ileti-onayi": { title: "Ticari Elektronik İleti Onayı", required: false },
};

function acceptKey(slug: string) {
  return `accept_${slug.replace(/-/g, "_")}`;
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    company: "",
    taxNumber: "",
    taxOffice: "",
  });
  const [acceptances, setAcceptances] = useState<Record<string, boolean>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({
    tax_levy: null,
    signature_circular: null,
    trade_registry: null,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allRequiredAccepted = REGISTRATION_REQUIRED_SLUGS.every((slug) => acceptances[slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!allRequiredAccepted) {
      setError("Tüm zorunlu sözleşmeleri ayrı ayrı onaylamanız gerekir");
      return;
    }

    for (const type of MEMBER_REQUIRED_DOCUMENTS) {
      if (!files[type]) {
        setError(`${MEMBER_DOCUMENT_LABELS[type]} yüklenmelidir`);
        return;
      }
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      for (const slug of [...REGISTRATION_REQUIRED_SLUGS, ...REGISTRATION_OPTIONAL_SLUGS]) {
        fd.append(acceptKey(slug), String(!!acceptances[slug]));
      }
      for (const type of MEMBER_REQUIRED_DOCUMENTS) {
        fd.append(`document_${type}`, files[type]!);
      }

      const res = await fetch("/api/auth/register", { method: "POST", body: fd });
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
            Evraklarınız ve sözleşme onaylarınız admin ekibimize iletildi. Başvuru durumunuzu takip etmek için giriş yapabilirsiniz.
          </p>
          <Link href="/auth/login"><Button className="mt-4">Giriş Sayfasına Dön</Button></Link>
        </div>
      </div>
    );
  }

  const legalSlugs = [...REGISTRATION_REQUIRED_SLUGS, ...REGISTRATION_OPTIONAL_SLUGS];

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-ena-text">B4B Üyelik Başvurusu</h1>
          <p className="mt-2 text-sm text-ena-light">Her sözleşme ayrı onaylanmalıdır. Admin onayından sonra hesabınız aktif olur.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="name" label="Ad Soyad *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={loading} />
          <Input id="email" label="E-posta *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={loading} />
          <Input id="password" label="Şifre *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required disabled={loading} />
          <Input id="phone" label="Telefon *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required disabled={loading} />
          <Input id="company" label="Firma / Ünvan *" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required disabled={loading} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="taxNumber" label="Vergi No *" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} required disabled={loading} />
            <Input id="taxOffice" label="Vergi Dairesi *" value={form.taxOffice} onChange={(e) => setForm({ ...form, taxOffice: e.target.value })} required disabled={loading} />
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold text-ena-text flex items-center gap-2"><Upload size={16} /> Zorunlu Evraklar</p>
            {MEMBER_REQUIRED_DOCUMENTS.map((type) => (
              <label key={type} className="block rounded-lg border border-ena-border p-3 cursor-pointer hover:bg-ena-card/30">
                <span className="text-sm font-medium text-ena-text">{MEMBER_DOCUMENT_LABELS[type]} *</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="mt-2 block w-full text-xs text-ena-light" onChange={(e) => setFiles({ ...files, [type]: e.target.files?.[0] || null })} required />
              </label>
            ))}
          </div>

          <div className="space-y-2 rounded-xl border border-ena-border p-4">
            <p className="text-sm font-semibold text-ena-text">Hukuki Onaylar</p>
            {legalSlugs.map((slug) => {
              const ui = CONTRACT_UI[slug];
              if (!ui) return null;
              return (
                <label key={slug} className="flex items-start gap-2 text-sm text-ena-light cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!acceptances[slug]}
                    onChange={(e) => setAcceptances({ ...acceptances, [slug]: e.target.checked })}
                    className="mt-1"
                    required={ui.required}
                  />
                  <span>
                    <Link href={`/contracts/${slug}`} target="_blank" className="text-ena-primary hover:underline">{ui.title}</Link>
                    {ui.required ? " — okudum ve kabul ediyorum *" : " — kabul ediyorum (opsiyonel)"}
                  </span>
                </label>
              );
            })}
          </div>

          {error && <p className="text-sm text-red-500 bg-red-500/10 rounded p-2">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading || !allRequiredAccepted}>
            {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Gönderiliyor…</> : "Başvuruyu Gönder"}
          </Button>
        </form>

        <p className="text-center text-sm text-ena-light">
          Zaten hesabın var mı? <Link href="/auth/login" className="font-medium text-ena-primary">Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
}
