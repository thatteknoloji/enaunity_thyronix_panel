"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PodEditorProShell } from "@/components/pod-editor-pro/PodEditorProShell";
import type { PodUiRole } from "@/lib/pod-core/pod-ui-bridge";
import { podBasePath } from "@/lib/pod-core/pod-ui-bridge";

type Props = {
  role: PodUiRole;
};

export function PodUnifiedDesignerShell({ role }: Props) {
  const base = podBasePath(role);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-3">
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href={`${base}/designs`}
          className="inline-flex items-center gap-1 text-xs text-ena-light hover:text-white"
        >
          <ArrowLeft size={14} /> Tasarımlarım
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80">
          POD Core Tasarım Stüdyosu
        </p>
      </div>
      <PodEditorProShell role={role} />
    </div>
  );
}
