"use client";

import { useEffect, useState } from "react";
import { PodUnifiedDashboard } from "@/components/pod-core/PodUnifiedDashboard";
import { POD_CORE_SOURCE } from "@/lib/pod-core/pod-types";

export default function DealerPodPage() {
  const [stats, setStats] = useState<{ designs: number; projects: number; storeReady: number } | null>(null);

  useEffect(() => {
    fetch(`/api/pod/projects?source=${POD_CORE_SOURCE}`)
      .then((r) => r.json())
      .then((d) => {
        const total = d.success ? d.data.total : 0;
        setStats({ designs: total, projects: total, storeReady: 0 });
      })
      .catch(() => setStats({ designs: 0, projects: 0, storeReady: 0 }));
  }, []);

  return <PodUnifiedDashboard role="dealer" stats={stats} />;
}
