"use client";

import { useState } from "react";
import { Factory } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import type { ProductionJobDto } from "@/lib/production-center/types";

type Props = {
  coreOrderId?: string;
  dealerOrderId?: string;
  dealerOrderItemId?: string;
  podProjectId?: string;
  disabled?: boolean;
  onCreated?: (job: ProductionJobDto) => void;
};

export function SendToProductionButton({
  coreOrderId,
  dealerOrderId,
  dealerOrderItemId,
  podProjectId,
  disabled,
  onCreated,
}: Props) {
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/production/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coreOrderId,
          dealerOrderId,
          dealerOrderItemId,
          podProjectId,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Üretime gönderildi: ${json.data.jobNumber}`);
      onCreated?.(json.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Üretim işi oluşturulamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void send()}
      disabled={disabled || loading || (!coreOrderId && !dealerOrderId)}
      className="gap-2 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
    >
      <Factory size={16} />
      {loading ? "Gönderiliyor…" : "Üretime Gönder"}
    </Button>
  );
}
