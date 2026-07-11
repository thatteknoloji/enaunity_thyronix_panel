import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePodCreatorApiAccess } from "@/lib/pod/api-guard";

export async function GET() {
  try {
    const { error } = await requirePodCreatorApiAccess();
    if (error) return error;

    const items = await prisma.pODProductTemplate.findMany({
      where: { status: "active" },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ success: true, data: items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Şablonlar alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
