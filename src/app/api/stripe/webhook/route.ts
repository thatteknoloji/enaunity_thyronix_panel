import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = body.type || "";
    const paymentIntent = body.data?.object || {};

    if (type === "payment_intent.succeeded") {
      const orderId = paymentIntent.metadata?.orderId;
      const dealerId = paymentIntent.metadata?.dealerId;
      const amount = paymentIntent.amount_received ? paymentIntent.amount_received / 100 : 0;

      if (dealerId) {
        await prisma.payment.create({
          data: {
            dealerId,
            orderId: orderId || undefined,
            amount,
            type: "payment",
            note: "Stripe ödemesi (payment_intent.succeeded)",
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Stripe webhook error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
