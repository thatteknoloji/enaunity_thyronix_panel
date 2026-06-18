import { NextRequest, NextResponse } from "next/server";
import { kargonomi } from "@/lib/kargonomi";

export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case "balance": {
        const data = await kargonomi.getBalance();
        return NextResponse.json({ success: true, data });
      }
      case "carriers": {
        const data = await kargonomi.getCarriers();
        return NextResponse.json({ success: true, data });
      }
      case "listShipments": {
        const data = await kargonomi.listShipments(params);
        return NextResponse.json({ success: true, data });
      }
      case "getShipment": {
        const data = await kargonomi.getShipment(params.id);
        return NextResponse.json({ success: true, data });
      }
      case "createShipment": {
        const data = await kargonomi.createShipment(params);
        return NextResponse.json({ success: true, data });
      }
      case "updateShipment": {
        const data = await kargonomi.updateShipment(params.id, params);
        return NextResponse.json({ success: true, data });
      }
      case "patchShipment": {
        const data = await kargonomi.patchShipment(params.id, params);
        return NextResponse.json({ success: true, data });
      }
      case "deleteShipment": {
        const data = await kargonomi.deleteShipment(params.id);
        return NextResponse.json({ success: true, data });
      }
      case "confirmShippingPrice": {
        const data = await kargonomi.confirmShippingPrice(params.id);
        return NextResponse.json({ success: true, data });
      }
      case "cancelShipment": {
        const data = await kargonomi.cancelShipment(params.id, params.reason);
        return NextResponse.json({ success: true, data });
      }
      case "getBarcodeUrl": {
        const url = kargonomi.getBarcodeUrl(params.id);
        return NextResponse.json({ success: true, data: { url } });
      }
      case "getPriceComparison": {
        const data = await kargonomi.getPriceComparison(params.id);
        return NextResponse.json({ success: true, data });
      }
      case "listWarehouses": {
        const data = await kargonomi.listWarehouses();
        return NextResponse.json({ success: true, data });
      }
      case "createWarehouse": {
        const data = await kargonomi.createWarehouse(params);
        return NextResponse.json({ success: true, data });
      }
      case "getStates": {
        const data = await kargonomi.getStates(params.countryId);
        return NextResponse.json({ success: true, data });
      }
      case "getCities": {
        const data = await kargonomi.getCities(params.stateId);
        return NextResponse.json({ success: true, data });
      }
      case "listWebhooks": {
        const data = await kargonomi.listWebhooks();
        return NextResponse.json({ success: true, data });
      }
      case "createWebhook": {
        const data = await kargonomi.createWebhook(params);
        return NextResponse.json({ success: true, data });
      }
      case "updateWebhook": {
        const data = await kargonomi.updateWebhook(params.id, params);
        return NextResponse.json({ success: true, data });
      }
      case "deleteWebhook": {
        const data = await kargonomi.deleteWebhook(params.id);
        return NextResponse.json({ success: true, data });
      }
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "API error" }, { status: 500 });
  }
}
