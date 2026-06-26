"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePodCore } from "@/components/pod-core/pod-core-context";
import { getMockupTemplate } from "@/lib/pod-core/mockup-template-registry";

/** URL ?template= & ?project= parametrelerinden stüdyo bootstrap */
export function PodUrlBootstrap() {
  const searchParams = useSearchParams();
  const { setMockupTemplate, setProjectMeta } = usePodCore();

  useEffect(() => {
    const templateId = searchParams.get("template");
    if (templateId) {
      const tpl = getMockupTemplate(templateId);
      if (tpl) setMockupTemplate(tpl);
    }
  }, [searchParams, setMockupTemplate]);

  useEffect(() => {
    const projectId = searchParams.get("project");
    if (!projectId) return;

    fetch("/api/pod/projects?source=pod_core", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "load", projectId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !d.data) return;
        const record = d.data;
        if (record.mockupTemplate) setMockupTemplate(record.mockupTemplate);
        setProjectMeta({
          projectId: record.projectId,
          projectName: record.projectName,
          lastLoadedAt: Date.now(),
          pricingSnapshot: record.pricingSnapshot ?? null,
        });
      })
      .catch(() => undefined);
  }, [searchParams, setMockupTemplate, setProjectMeta]);

  return null;
}
