import { PodOrderPipeline } from "@/components/pod-core/PodOrderPipeline";

export default function DealerPodOrdersPage() {
  return (
    <div className="p-6">
      <PodOrderPipeline role="dealer" />
    </div>
  );
}
