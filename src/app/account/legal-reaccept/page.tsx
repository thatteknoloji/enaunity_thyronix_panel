"use client";

import { LegalReacceptanceGate } from "@/components/legal/LegalReacceptanceGate";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Loader2, ShieldAlert } from "lucide-react";

type PendingItem = {
  slug: string;
  title: string;
  currentVersionLabel: string;
  acceptedVersionLabel: string | null;
  pdfUrl: string;
  taskId: string;
};

export default function LegalReacceptPage() {
  return (
    <LegalReacceptanceGate scope="all">
      <LegalReacceptContent />
    </LegalReacceptanceGate>
  );
}

function LegalReacceptContent() {
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [accepting, setAccepting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/member/legal/pending");
    const json = await res.json();
    setLoading(false);
    if (json.success) setPending(json.data.pending || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const acceptOne = async (slug: string) => {
    setAccepting(slug);
    const res = await fetch("/api/member/legal/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, context: "reconsent" }),
    });
    const json = await res.json();
    setAccepting(null);
    if (json.success) {
      toast.success("Onaylandı");
      load();
    } else toast.error(json.error || "Hata");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-ena-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="text-amber-600" size={28} />
        <div>
          <h1 className="text-2xl font-black text-ena-text">Sözleşme Yeniden Onayı</h1>
          <p className="text-sm text-ena-light">Güncellenen sözleşmeleri okuyup onaylayın.</p>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          Bekleyen sözleşme onayı yok. <Link href="/account" className="underline">Hesabıma dön</Link>
        </div>
      ) : (
        pending.map((item) => (
          <div key={item.taskId} className="rounded-xl border border-ena-border p-5 space-y-3">
            <div className="flex gap-2">
              <FileText size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-ena-text">{item.title}</p>
                <p className="text-xs text-ena-light">
                  {item.acceptedVersionLabel ? `${item.acceptedVersionLabel} → ` : ""}{item.currentVersionLabel}
                </p>
              </div>
            </div>
            <div className="flex gap-3 text-xs">
              <Link href={`/contracts/${item.slug}`} target="_blank" className="text-ena-primary hover:underline inline-flex items-center gap-1">
                <ExternalLink size={12} /> Metin
              </Link>
              {item.pdfUrl && (
                <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-ena-primary hover:underline inline-flex items-center gap-1">
                  <ExternalLink size={12} /> PDF
                </a>
              )}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={!!checked[item.slug]} onChange={(e) => setChecked({ ...checked, [item.slug]: e.target.checked })} className="mt-1" />
              Okudum ve kabul ediyorum.
            </label>
            <Button disabled={!checked[item.slug] || accepting === item.slug} onClick={() => acceptOne(item.slug)}>
              {accepting === item.slug ? <Loader2 size={14} className="animate-spin mr-2" /> : null} Onayla
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
