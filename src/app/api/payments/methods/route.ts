import { NextResponse } from "next/server";
import { getPublicPaymentSettings } from "@/lib/payments/payment-settings";

/** @deprecated use /api/payments/settings */
export async function GET() {
  const data = await getPublicPaymentSettings();
  return NextResponse.json({
    success: true,
    data: {
      ...data,
      esnekpos: data.activeCardProvider === "ESNEKPOS",
      iyzico: data.activeCardProvider === "IYZICO",
    },
  });
}
