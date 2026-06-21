import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertPodCreatorAccess } from "@/lib/pod/access";

export async function requirePodCreatorApiAccess() {
  const user = await getSession();
  if (!user) {
    return { error: NextResponse.json({ success: false, error: "Giriş gerekli", code: "AUTH_REQUIRED" }, { status: 401 }) };
  }
  const access = await assertPodCreatorAccess(user);
  if (!access.allowed) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: access.reason || "POD Creator erişimi yok",
          code: access.code,
          redirectTo: access.redirectTo,
        },
        { status: 403 }
      ),
    };
  }
  return { user };
}
