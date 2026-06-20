"use client";

import { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import toast from "react-hot-toast";
import { siteProseClass } from "../SitePageShell";

type ContactPageTemplateProps = {
  content: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
};

export default function ContactPageTemplate({
  content,
  contactEmail,
  contactPhone,
  address,
}: ContactPageTemplateProps) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Mesajınız alındı. En kısa sürede dönüş yapacağız.");
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        toast.error(data.error || "Gönderilemedi");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSending(false);
    }
  };

  const email = contactEmail || "info@enaunity.com";
  const phone = contactPhone || "+90 (212) 555 00 00";

  return (
    <div className="space-y-6">
      {content ? (
        <div className={`rounded-xl border border-white/10 bg-ena-card/30 p-6 md:p-8 ${siteProseClass}`}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        <a href={`mailto:${email}`} className="rounded-xl border border-white/10 bg-ena-card/30 p-5 transition-colors hover:border-ena-primary/30">
          <Mail className="mb-3 text-ena-primary" size={22} />
          <p className="text-xs uppercase tracking-wide text-ena-light">E-posta</p>
          <p className="mt-1 text-sm font-medium text-ena-text break-all">{email}</p>
        </a>
        <a href={`tel:${phone.replace(/\s/g, "")}`} className="rounded-xl border border-white/10 bg-ena-card/30 p-5 transition-colors hover:border-ena-primary/30">
          <Phone className="mb-3 text-ena-primary" size={22} />
          <p className="text-xs uppercase tracking-wide text-ena-light">Telefon</p>
          <p className="mt-1 text-sm font-medium text-ena-text">{phone}</p>
        </a>
        <div className="rounded-xl border border-white/10 bg-ena-card/30 p-5">
          <MapPin className="mb-3 text-ena-primary" size={22} />
          <p className="text-xs uppercase tracking-wide text-ena-light">Adres</p>
          <p className="mt-1 text-sm text-ena-text whitespace-pre-line">{address || "İstanbul, Türkiye"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-ena-card/30 p-6 md:p-8 space-y-4">
        <h2 className="text-lg font-semibold text-ena-text">İletişim Formu</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ena-light">Ad Soyad</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-ena-dark px-3 py-2.5 text-sm text-ena-text focus:border-ena-primary/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ena-light">E-posta</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-ena-dark px-3 py-2.5 text-sm text-ena-text focus:border-ena-primary/50 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ena-light">Konu</label>
          <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-ena-dark px-3 py-2.5 text-sm text-ena-text focus:border-ena-primary/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ena-light">Mesaj</label>
          <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-ena-dark px-3 py-2.5 text-sm text-ena-text focus:border-ena-primary/50 focus:outline-none resize-y"
          />
        </div>
        <button type="submit" disabled={sending}
          className="inline-flex items-center gap-2 rounded-lg bg-ena-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:brightness-110 disabled:opacity-50">
          <Send size={16} />
          {sending ? "Gönderiliyor..." : "Gönder"}
        </button>
      </form>
    </div>
  );
}
