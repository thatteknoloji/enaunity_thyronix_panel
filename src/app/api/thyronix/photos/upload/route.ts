import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse, withTenantFilter } from "@/lib/thyronix/access";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const barcode = formData.get("barcode") as string | null;

    if (!file || !barcode) {
      return NextResponse.json({ success: false, error: "Dosya ve barkod gerekli" }, { status: 400 });
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: "Geçersiz dosya tipi: " + file.type }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "thyronix-photos");
    await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop() || "jpg";
    const safeName = `${barcode.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
    const filePath = path.join(uploadDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const photoUrl = `/uploads/thyronix-photos/${safeName}`;
    const matched = await prisma.thyronixProduct.findMany({
      where: withTenantFilter(user, {
        OR: [{ barcode }, { stockCode: barcode }],
      }),
    });

    let updated = 0;
    for (const product of matched) {
      await prisma.thyronixProduct.update({
        where: { id: product.id },
        data: { images: photoUrl } as any,
      });
      updated++;
    }

    return NextResponse.json({
      success: true,
      data: { matched: matched.length, uploaded: updated, url: photoUrl },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
