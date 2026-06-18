import { NextResponse } from "next/server";
import { getAvailablePaymentMethods, isEsnekposEnabled, isIyzicoEnabled } from "@/lib/payments/gateway-config";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      methods: getAvailablePaymentMethods(),
      esnekpos: isEsnekposEnabled(),
      iyzico: isIyzicoEnabled(),
    },
  });
}
