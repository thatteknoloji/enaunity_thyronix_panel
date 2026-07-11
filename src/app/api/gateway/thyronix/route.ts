import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { provisionThyronixAccount, resolveThyronixGatewayState } from "@/lib/thyronix/integration";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "Oturum bulunamadı", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  let state = await resolveThyronixGatewayState(user);

  if (state.step === "setup") {
    try {
      const result = await provisionThyronixAccount(user);
      state = {
        step: "ready",
        linkId: result.link.id,
        externalEmail: result.link.externalEmail,
        redirectTo: "/thyronix",
      };
    } catch {
      /* setup ekranı — manuel oluşturma */
    }
  }

  return NextResponse.json({ success: true, data: state });
}
