"use client";

import { useParams } from "next/navigation";
import OperasyonOrderDetailView from "@/components/orders/OperasyonOrderDetailView";

export default function DealerOperasyonOrderDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");

  return (
    <OperasyonOrderDetailView
      scope="dealer"
      orderId={id}
      backHref="/dealer/marketplace/orders"
    />
  );
}
