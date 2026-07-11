import { NextResponse } from "next/server";
import { requirePodCreatorApiAccess } from "@/lib/pod/api-guard";
import { productionPackToFileMap } from "@/lib/pod-core/project-serializer";
import { loadPodCoreProject, savePodCoreProject } from "@/lib/pod-core/project-store";

export async function POST(req: Request) {
  try {
    const { error, user } = await requirePodCreatorApiAccess();
    if (error) return error;

    const body = await req.json();
    const projectId = String(body.projectId || "");
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId gerekli" }, { status: 400 });
    }

    const record = await loadPodCoreProject(user!.id, projectId);
    if (!record) {
      return NextResponse.json({ success: false, error: "Proje bulunamadı" }, { status: 404 });
    }

    if (!record.productionPack) {
      return NextResponse.json(
        { success: false, error: "Production pack henüz oluşturulmamış — önce projeyi kaydedin" },
        { status: 400 }
      );
    }

    const exportCount = (record.exportCount ?? 0) + 1;
    const updated = await savePodCoreProject({
      ...record,
      exportCount,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId: updated.projectId,
        files: productionPackToFileMap(updated.productionPack!),
        exportCount: updated.exportCount,
        generatedAt: new Date().toISOString(),
        storage: "local",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Production pack oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
