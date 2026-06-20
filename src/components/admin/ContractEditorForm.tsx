"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { CONTRACT_TYPES, CONTRACT_TYPE_LABELS } from "@/lib/contracts/types";

export type ContractFormState = {
  title: string;
  slug: string;
  content: string;
  type: string;
  active: boolean;
};

type Props = {
  mode: "create" | "edit";
  contractId?: string;
  initial: ContractFormState;
};

export function ContractEditorForm({ mode, contractId, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ContractFormState>(initial);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Başlık gerekli");

    setSaving(true);
    const body = {
      title: form.title.trim(),
      slug: form.slug.trim() || form.title.toLowerCase().replace(/\s+/g, "-"),
      content: form.content,
      type: form.type,
      active: form.active,
    };

    const url = mode === "edit" && contractId
      ? `/api/admin/contracts/${contractId}`
      : "/api/admin/contracts";
    const method = mode === "edit" ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(mode === "edit" ? "Sözleşme güncellendi" : "Sözleşme oluşturuldu");
      router.push(toAdminUrl("/admin/contracts"));
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Kaydedilemedi");
    }
    setSaving(false);
  };

  const ic = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none";

  return (
    <div className="max-w-4xl">
      <Link
        href={toAdminUrl("/admin/contracts")}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={14} /> Sözleşmelere Dön
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {mode === "edit" ? form.title || "Sözleşme Düzenle" : "Yeni Sözleşme"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Başlık</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={ic}
                placeholder="KVKK Aydınlatma Metni"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Slug (URL)</label>
              <input
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className={`${ic} font-mono`}
                placeholder="kvkk-aydinlatma-metni"
              />
              <p className="mt-1 text-xs text-gray-400">
                Canlı URL:{" "}
                <a
                  href={`/contracts/${form.slug || "..."}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-mono"
                >
                  /contracts/{form.slug || "..."}
                </a>
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tür</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className={ic}
            >
              {CONTRACT_TYPES.map((t) => (
                <option key={t} value={t}>{CONTRACT_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              {form.type === "dealer"
                ? "Bayi sözleşmeleri listeden bayilere atanır; /contracts genel listesinde görünmez."
                : "Herkese açık sözleşmeler /contracts sayfasında listelenir."}
            </p>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => setForm({ ...form, active: !form.active })}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                form.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"
              }`}
            >
              {form.active ? <Eye size={12} /> : <EyeOff size={12} />}
              {form.active ? "Yayında" : "Taslak"}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">İçerik</label>
            <RichTextEditor
              content={form.content}
              onChange={(html) => setForm({ ...form, content: html })}
              minHeight={360}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <Link href={toAdminUrl("/admin/contracts")}>
            <button type="button" className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              İptal
            </button>
          </Link>
        </div>
      </form>
    </div>
  );
}
