import { ProductionCenterShell } from "@/components/production-center/ProductionCenterShell";

export default function AdminProductionCenterPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] p-4 gap-3 min-h-0">
      <ProductionCenterShell />
    </div>
  );
}
