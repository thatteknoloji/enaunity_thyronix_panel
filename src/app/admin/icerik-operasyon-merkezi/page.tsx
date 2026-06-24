"use client";

import { Suspense } from "react";
import { ContentOperationsShell } from "@/components/content-operations/ContentOperationsShell";

export default function IcerikOperasyonMerkeziPage() {
  return (
    <div className="p-6">
      <Suspense fallback={<div className="text-sm text-gray-500">Yükleniyor…</div>}>
        <ContentOperationsShell />
      </Suspense>
    </div>
  );
}
