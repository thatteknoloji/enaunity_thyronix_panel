import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { provisionHiveAccount, resolveHiveGatewayState } from "@/lib/hive/integration";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "Oturum bulunamadı", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  let state = await resolveHiveGatewayState(user);

  if (state.step === "setup") {
    try {
      const result = await provisionHiveAccount(user);
      state = {
        step: "ready",
        linkId: result.link.id,
        externalEmail: result.link.externalEmail,
        redirectTo: result.redirectTo,
      };
    } catch {
      /* setup ekranı */
    }
  }

  return NextResponse.json({ success: true, data: state });
}
