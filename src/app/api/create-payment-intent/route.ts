import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { amount, currency, orderId, dealerId } = await req.json();
    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Geçersiz tutar" }, { status: 400 });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency?.toLowerCase() || "try",
      metadata: { orderId: orderId || "", dealerId: dealerId || "" },
      automatic_payment_methods: { enabled: true },
    });
    return NextResponse.json({ success: true, data: { clientSecret: paymentIntent.client_secret } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Stripe error" }, { status: 500 });
  }
}
