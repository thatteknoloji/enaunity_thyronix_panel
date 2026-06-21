import { getSession } from "@/lib/auth";
import { assertPageFactoryAccess } from "./access";
import { NextResponse } from "next/server";

export async function requirePageFactoryApiAccess() {
  const user = await getSession();
  const access = await assertPageFactoryAccess(user);
  if (!access.allowed) {
    return {
      error: NextResponse.json(
        { success: false, error: access.reason, code: access.code },
        { status: access.code === "AUTH_REQUIRED" ? 401 : 403 }
      ),
      user: null,
    };
  }
  return { error: null, user: user! };
}
