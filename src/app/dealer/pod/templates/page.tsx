import { PodProfileGrid } from "@/components/pod-core/PodProfileGrid";
import { buildPodProfileCards } from "@/lib/pod-core/pod-ui-bridge";

export default function DealerPodTemplatesPage() {
  const profiles = buildPodProfileCards("dealer");
  return (
    <div className="p-6">
      <PodProfileGrid role="dealer" profiles={profiles} />
    </div>
  );
}
