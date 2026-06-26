import { PodProjectList } from "@/components/pod-core/PodProjectList";
import { PodUnifiedDesignerShell } from "@/components/pod-core/PodUnifiedDesignerShell";

type Props = { searchParams: Promise<{ new?: string }> };

export default async function DealerPodDesignsPage({ searchParams }: Props) {
  const params = await searchParams;
  const isStudio = params.new === "1";

  return (
    <div className="max-w-5xl p-6">
      {isStudio ? (
        <PodUnifiedDesignerShell role="dealer" />
      ) : (
        <PodProjectList role="dealer" />
      )}
    </div>
  );
}
