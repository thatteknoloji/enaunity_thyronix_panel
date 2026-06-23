import { PodDesignerWorkspace } from "@/components/pod/PodDesignerWorkspace";
import { PodDesignLibrary } from "@/components/pod/PodDesignLibrary";

type Props = { searchParams: Promise<{ new?: string }> };

export default async function DealerPodDesignsPage({ searchParams }: Props) {
  const params = await searchParams;
  const isStudio = params.new === "1";

  return (
    <div className="max-w-5xl">
      {isStudio ? <PodDesignerWorkspace /> : (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white">Tasarımlarım</h1>
            <p className="text-sm text-ena-light/60 mt-1">PNG ve SVG tasarım kütüphaneniz</p>
          </div>
          <PodDesignLibrary />
        </div>
      )}
    </div>
  );
}
