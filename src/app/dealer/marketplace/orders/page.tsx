"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OperasyonOrdersPanel from "@/components/admin/OperasyonOrdersPanel";

export default function DealerMarketplaceOrdersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4 flex items-center gap-3">
        <Link href="/dealer" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Pazaryeri Operasyon</h1>
          <p className="text-xs text-gray-500">Satıra tıklayınca tam sipariş detay sayfası açılır</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto p-6">
        <OperasyonOrdersPanel scope="dealer" />
      </div>
    </div>
  );
}
