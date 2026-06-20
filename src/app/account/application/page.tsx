"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MEMBER_DOCUMENT_LABELS,
  MEMBER_REQUIRED_DOCUMENTS,
  MEMBER_STATUS_LABELS,
  type MemberChecklistItem,
  type MemberStatus,
} from "@/lib/members/checklist";
import { CheckCircle2, Clock, Loader2, Upload, XCircle } from "lucide-react";

type AppData = {
  status: MemberStatus;
  role: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  taxNumber: string;
  taxOffice: string;
  rejectionReason: string;
  kvkkAccepted: boolean;
  contractsAccepted: boolean;
  checklist: MemberChecklistItem[];
  checklistComplete: boolean;
  missingLegal?: string[];
  missingDealerLegal?: string[];
  memberDocuments: { id: string; type: string; fileName: string; status: string }[];
};

export default function MemberApplicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [profile, setProfile] = useState({ phone: "", company: "", taxNumber: "", taxOffice: "" });
  const [legal, setLegal] = useState({ kvkkAccepted: false, contractsAccepted: false });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/member/application");
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) router.push("/auth/login?redirect=/account/application");
      return;
    }
    setData(json.data);
    setProfile({
      phone: json.data.phone || "",
      company: json.data.company || "",
      taxNumber: json.data.taxNumber || "",
      taxOffice: json.data.taxOffice || "",
    });
    setLegal({
      kvkkAccepted: json.data.kvkkAccepted,
      contractsAccepted: json.data.contractsAccepted,
    });
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    setSaving(true);
    const res = await fetch("/api/member/application", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, ...legal }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.success) {
      toast.success("Bilgiler kaydedildi");
      load();
    } else toast.error(json.error || "Kayıt başarısız");
  };

  const acceptLegal = async (slug: string, context: string) => {
    setSaving(true);
    const res = await fetch("/api/member/legal/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, context }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.success) {
      toast.success("Sözleşme onayı kaydedildi");
      load();
    } else toast.error(json.error || "Onay kaydedilemedi");
  };

  const uploadDoc = async (type: string, file: File) => {
    setUploading(type);
    const fd = new FormData();
    fd.append("type", type);
    fd.append("file", file);
    const res = await fetch("/api/member/documents", { method: "POST", body: fd });
    const json = await res.json();
    setUploading(null);
    if (json.success) {
      toast.success("Evrak yüklendi — admin incelemesine gönderildi");
      load();
    } else toast.error(json.error || "Yükleme başarısız");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-ena-primary" size={32} />
      </div>
    );
  }

  if (!data) return null;

  const done = data.checklist.filter((c) => c.ok).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-ena-text">Üyelik Başvurum</h1>
        <p className="text-sm text-ena-light mt-1">
          Durum: <span className="font-medium">{MEMBER_STATUS_LABELS[data.status]}</span>
          {data.role === "dealer" && " · Bayi hesabına geçildi"}
        </p>
      </div>

      {data.status === "pending" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-2">
          <Clock size={18} className="shrink-0" />
          Başvurunuz inceleniyor. Eksik bilgi ve evrakları tamamlayın; admin onayından sonra alışverişe başlayabilirsiniz.
        </div>
      )}

      {data.status === "rejected" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Başvurunuz reddedildi: {data.rejectionReason || "Sebep belirtilmedi"}
        </div>
      )}

      {data.status === "active" && data.role === "user" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Üyeliğiniz onaylandı. Bayi olmak için tüm koşulların tamamlanması ve admin tarafından bayiye çevrilmeniz gerekir.
        </div>
      )}

      <section className="rounded-xl border border-ena-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ena-text">Onay Koşulları</h2>
          <span className={done === data.checklist.length ? "text-emerald-600 text-sm" : "text-amber-600 text-sm"}>
            {done}/{data.checklist.length}
          </span>
        </div>
        {data.checklist.map((item) => (
          <div key={item.key} className="flex gap-2 text-sm">
            {item.ok ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <XCircle size={16} className="text-amber-600 shrink-0" />}
            <div>
              <p className="font-medium text-ena-text">{item.label}</p>
              <p className="text-xs text-ena-light">{item.detail}</p>
            </div>
          </div>
        ))}
      </section>

      {data.role === "user" && (
        <>
          <section className="rounded-xl border border-ena-border p-5 space-y-4">
            <h2 className="font-semibold text-ena-text">Firma Bilgileri</h2>
            <Input id="phone" label="Telefon" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <Input id="company" label="Firma / Ünvan" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input id="taxNumber" label="Vergi No" value={profile.taxNumber} onChange={(e) => setProfile({ ...profile, taxNumber: e.target.value })} />
              <Input id="taxOffice" label="Vergi Dairesi" value={profile.taxOffice} onChange={(e) => setProfile({ ...profile, taxOffice: e.target.value })} />
            </div>
            {!data.kvkkAccepted && (
              <label className="flex items-start gap-2 text-sm text-ena-light">
                <input type="checkbox" checked={legal.kvkkAccepted} onChange={(e) => setLegal({ ...legal, kvkkAccepted: e.target.checked })} className="mt-1" />
                <span><Link href="/contracts/kvkk-aydinlatma-metni" target="_blank" className="text-ena-primary hover:underline">KVKK</Link> metnini kabul ediyorum.</span>
              </label>
            )}
            {!data.contractsAccepted && (
              <label className="flex items-start gap-2 text-sm text-ena-light">
                <input type="checkbox" checked={legal.contractsAccepted} onChange={(e) => setLegal({ ...legal, contractsAccepted: e.target.checked })} className="mt-1" />
                <span>Zorunlu sözleşmeleri kabul ediyorum.</span>
              </label>
            )}
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? <><Loader2 size={14} className="mr-2 animate-spin" /> Kaydediliyor…</> : "Bilgileri Kaydet"}
            </Button>
          </section>

          {(data.missingLegal?.length || 0) > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 space-y-3">
              <h2 className="font-semibold text-ena-text">Eksik / Güncellenmiş Sözleşmeler</h2>
              {data.missingLegal!.map((slug) => (
                <div key={slug} className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                  <Link href={`/contracts/${slug}`} target="_blank" className="text-sm text-ena-primary hover:underline">{slug}</Link>
                  <Button size="sm" disabled={saving} onClick={() => acceptLegal(slug, "reconsent")}>Onayla</Button>
                </div>
              ))}
            </section>
          )}

          {(data.missingDealerLegal?.length || 0) > 0 && data.status === "active" && (
            <section className="rounded-xl border border-purple-200 bg-purple-50/50 p-5 space-y-3">
              <h2 className="font-semibold text-ena-text">Bayi Sözleşmeleri (Bayiye çevrilmeden önce)</h2>
              {data.missingDealerLegal!.map((slug) => (
                <div key={slug} className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                  <Link href={`/contracts/${slug}`} target="_blank" className="text-sm text-ena-primary hover:underline">{slug}</Link>
                  <Button size="sm" disabled={saving} onClick={() => acceptLegal(slug, "dealer_apply")}>Onayla</Button>
                </div>
              ))}
            </section>
          )}

          <section className="rounded-xl border border-ena-border p-5 space-y-4">
            <h2 className="font-semibold text-ena-text flex items-center gap-2"><Upload size={18} /> Evraklar</h2>
            {MEMBER_REQUIRED_DOCUMENTS.map((type) => {
              const doc = data.memberDocuments.find((d) => d.type === type);
              return (
                <div key={type} className="rounded-lg border border-ena-border/60 p-3">
                  <p className="text-sm font-medium text-ena-text">{MEMBER_DOCUMENT_LABELS[type]}</p>
                  {doc ? (
                    <p className="text-xs text-ena-light mt-1">
                      {doc.fileName} · {doc.status === "approved" ? "Onaylandı" : doc.status === "rejected" ? "Reddedildi — yeniden yükleyin" : "İnceleme bekliyor"}
                    </p>
                  ) : (
                    <p className="text-xs text-red-600 mt-1">Henüz yüklenmedi</p>
                  )}
                  {(!doc || doc.status === "rejected") && (
                    <label className="mt-2 block">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="text-xs"
                        disabled={uploading === type}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadDoc(type, f);
                        }}
                      />
                      {uploading === type && <span className="text-xs text-ena-light ml-2">Yükleniyor…</span>}
                    </label>
                  )}
                </div>
              );
            })}
          </section>
        </>
      )}

      <Link href="/account" className="text-sm text-ena-primary hover:underline">← Hesabıma dön</Link>
    </div>
  );
}
