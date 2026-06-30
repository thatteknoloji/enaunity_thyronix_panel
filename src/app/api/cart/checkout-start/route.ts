import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { markCheckoutStartedForUser } from "@/lib/cart/cart-observer-service";

export async function POST() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const result = await markCheckoutStartedForUser(user.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 },
    );
  }
}
