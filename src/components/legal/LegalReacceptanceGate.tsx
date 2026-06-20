"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Loader2, ShieldAlert } from "lucide-react";

type PendingItem = {
  slug: string;
  title: string;
  currentVersionLabel: string;
  acceptedVersionLabel: string | null;
  pdfUrl: string;
  blocks: string[];
  taskId: string;
};

type PendingState = {
  status: string;
  pending: PendingItem[];
  blockedServices: { account: boolean; dealer: boolean; hive: boolean; thyronix: boolean };
};

type Scope = "account" | "dealer" | "hive" | "thyronix" | "all";

export function LegalReacceptanceGate({
  scope = "all",
  children,
}: {
  scope?: Scope;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [state, setState] = useState<PendingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/member/legal/pending");
    if (!res.ok) {
      setState(null);
      setLoading(false);
      return;
    }
    const json = await res.json();
    setState(json.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const relevantPending = (state?.pending || []).filter((p) => {
    if (scope === "all") return true;
    return p.blocks.includes(scope);
  });

  const serviceBlocked =
    state?.status === "pending_reacceptance" &&
    relevantPending.length > 0 &&
    (scope === "all"
      ? true
      : scope === "account"
        ? !!state?.blockedServices.account
        : scope === "dealer"
          ? !!state?.blockedServices.dealer
          : scope === "hive"
            ? !!state?.blockedServices.hive
            : !!state?.blockedServices.thyronix);

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
      toast.success("Sözleşme onaylandı");
      await load();
    } else toast.error(json.error || "Onay kaydedilemedi");
  };

  const acceptAll = async () => {
    for (const item of relevantPending) {
      if (!checked[item.slug]) {
        toast.error("Tüm sözleşmeleri işaretleyip onaylamanız gerekir");
        return;
      }
    }
    setAccepting("all");
    for (const item of relevantPending) {
      await acceptOne(item.slug);
    }
    setAccepting(null);
  };

  if (loading) return <>{children}</>;
  if (pathname?.startsWith("/account/legal-reaccept")) return <>{children}</>;
  if (!serviceBlocked) return <>{children}</>;

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="border-b px-6 py-4 flex items-center gap-3 bg-amber-50">
            <ShieldAlert className="text-amber-700 shrink-0" size={24} />
            <div>
              <h2 className="font-bold text-gray-900">Güncellenen Sözleşmeler — Onay Gerekli</h2>
              <p className="text-sm text-gray-600">Onaylamadan devam edemezsiniz. Bu ekran kapatılamaz.</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-700">
              Onaylamanız gereken güncel sözleşmeler bulunmaktadır. Her birini okuyup ayrı ayrı onaylayın.
            </p>

            {relevantPending.map((item) => (
              <div key={item.taskId} className="rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <FileText size={18} className="text-gray-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.acceptedVersionLabel ? `${item.acceptedVersionLabel} → ` : ""}
                      {item.currentVersionLabel}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/contracts/${item.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <ExternalLink size={12} /> Metni Oku
                  </Link>
                  {item.pdfUrl && (
                    <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <ExternalLink size={12} /> PDF Snapshot
                    </a>
                  )}
                </div>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!checked[item.slug]}
                    onChange={(e) => setChecked({ ...checked, [item.slug]: e.target.checked })}
                    className="mt-1"
                  />
                  <span>Bu sözleşmeyi okudum ve kabul ediyorum.</span>
                </label>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!checked[item.slug] || accepting === item.slug}
                  onClick={() => acceptOne(item.slug)}
                >
                  {accepting === item.slug ? <Loader2 size={14} className="animate-spin" /> : "Onayla"}
                </Button>
              </div>
            ))}

            {relevantPending.length > 1 && (
              <Button className="w-full" disabled={!!accepting} onClick={acceptAll}>
                Tümünü Onayla ve Devam Et
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
