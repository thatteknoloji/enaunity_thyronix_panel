"use client";

import { Suspense } from "react";
import { PublishingCenterShell } from "@/components/publishing-center/PublishingCenterShell";

export default function YayinMerkeziPage() {
  return (
    <div className="p-6">
      <Suspense fallback={<div className="text-sm text-gray-500">Yükleniyor…</div>}>
        <PublishingCenterShell />
      </Suspense>
    </div>
  );
}
