"use client";

import { useParams } from "next/navigation";
import OperasyonOrderDetailView from "@/components/orders/OperasyonOrderDetailView";
import { toAdminUrl } from "@/lib/auth/admin-access";

export default function AdminOperasyonOrderDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");

  return (
    <OperasyonOrderDetailView
      scope="admin"
      orderId={id}
      backHref={toAdminUrl("/admin/orders?tab=operasyon")}
    />
  );
}
