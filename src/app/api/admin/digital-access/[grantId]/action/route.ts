import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { resendDigitalGrantAccess, setDigitalGrantStatus } from "@/lib/products/digital-access";

type Params = { params: Promise<{ grantId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { grantId } = await params;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();

    if (action === "resend") {
      await resendDigitalGrantAccess(grantId, {
        id: admin.id,
        role: admin.role,
        name: admin.name,
        email: admin.email,
      });
      return NextResponse.json({ success: true });
    }

    if (!["activate", "revoke", "restore"].includes(action)) {
      return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
    }

    const data = await setDigitalGrantStatus(
      grantId,
      action as "activate" | "revoke" | "restore",
      {
        id: admin.id,
        role: admin.role,
        name: admin.name,
        email: admin.email,
      },
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dijital teslimat işlemi başarısız";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
