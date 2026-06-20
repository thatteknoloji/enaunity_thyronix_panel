"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ContractEditorForm } from "@/components/admin/ContractEditorForm";
import Link from "next/link";
import { toAdminUrl } from "@/lib/auth/admin-access";

export default function EditContractPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<{
    title: string;
    slug: string;
    content: string;
    type: string;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/contracts/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setInitial({
            title: d.data.title,
            slug: d.data.slug,
            content: d.data.content || "",
            type: d.data.type || "public",
            active: d.data.active !== false,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-4xl">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-96 rounded bg-gray-200" />
      </div>
    );
  }

  if (!initial) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Sözleşme bulunamadı</p>
        <Link href={toAdminUrl("/admin/contracts")} className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          Listeye dön
        </Link>
      </div>
    );
  }

  return <ContractEditorForm mode="edit" contractId={id} initial={initial} />;
}
