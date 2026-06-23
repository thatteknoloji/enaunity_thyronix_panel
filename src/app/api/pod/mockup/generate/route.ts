import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePodCreatorApiAccess } from "@/lib/pod/api-guard";
import { assertPodResourceOwner } from "@/lib/pod/tenant-access";
import { generateProjectMockups } from "@/lib/pod/pod-mockup-generator";
import { getPodLicenseStatus } from "@/lib/pod/access";

export async function POST(req: Request) {
  try {
    const { error, user } = await requirePodCreatorApiAccess();
    if (error) return error;

    if (!user!.dealerId) {
      return NextResponse.json({ success: false, error: "Bayi hesabı gerekli" }, { status: 400 });
    }

    const body = await req.json();
    const projectId = String(body.projectId || "");
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId gerekli" }, { status: 400 });
    }

    const project = await prisma.pODProject.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ success: false, error: "Proje bulunamadı" }, { status: 404 });
    }
    assertPodResourceOwner(project.dealerId, user!);

    const status = await getPodLicenseStatus(user!.dealerId);
    const maxMockups = status.limits?.maxMockups;
    if (maxMockups) {
      const count = await prisma.pODProject.count({
        where: { dealerId: user!.dealerId, mockupUrl: { not: "" } },
      });
      if (count >= maxMockups) {
        return NextResponse.json(
          { success: false, error: `Mockup limiti (${maxMockups}) doldu` },
          { status: 403 }
        );
      }
    }

    const updated = await generateProjectMockups(projectId, user!.dealerId);
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Mockup üretilemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
