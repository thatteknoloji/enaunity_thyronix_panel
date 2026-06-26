import type { PodUiRole } from "@/lib/pod-core/pod-ui-bridge";

type Props = {
  role: PodUiRole;
};

export function PodOrderPipeline({ role }: Props) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Siparişler</h1>
        <p className="text-sm text-ena-light/60 mt-1">
          {role === "dealer" ? "Bayi" : "Admin"} POD sipariş pipeline — admin ile aynı altyapı (placeholder).
        </p>
      </div>
      <div className="rounded-xl border border-ena-border bg-ena-card/30 p-6 text-sm text-ena-light">
        Sipariş entegrasyonu sonraki fazda buraya bağlanacak. POD Core production pack hazır.
      </div>
    </div>
  );
}
