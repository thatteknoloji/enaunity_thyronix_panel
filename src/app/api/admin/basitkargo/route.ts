import { NextRequest, NextResponse } from "next/server";
import { basitkargo } from "@/lib/basitkargo";

export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case "handlers": {
        const data = await basitkargo.getHandlers();
        return NextResponse.json({ success: true, data });
      }
      case "feeByDesi": {
        const data = await basitkargo.getFeeByDesi(params.desiKg, params.codAmount, params.codType);
        return NextResponse.json({ success: true, data });
      }
      case "feeByPackages": {
        const data = await basitkargo.getFeeByPackages(params.packages);
        return NextResponse.json({ success: true, data });
      }
      case "createOrder": {
        const data = await basitkargo.createOrder(params);
        return NextResponse.json({ success: true, data });
      }
      case "createOrderWithBarcode": {
        const data = await basitkargo.createOrderWithBarcode(params);
        return NextResponse.json({ success: true, data });
      }
      case "updateOrder": {
        const data = await basitkargo.updateOrder(params.id, params);
        return NextResponse.json({ success: true, data });
      }
      case "filterOrders": {
        const data = await basitkargo.filterOrders(params);
        return NextResponse.json({ success: true, data });
      }
      case "getOrder": {
        const data = await basitkargo.getOrder(params.id);
        return NextResponse.json({ success: true, data });
      }
      case "cancelBarcode": {
        const data = await basitkargo.cancelBarcode(params.barcode);
        return NextResponse.json({ success: true, data });
      }
      case "createReturn": {
        const data = await basitkargo.createReturn(params.barcode);
        return NextResponse.json({ success: true, data });
      }
      case "balance": {
        const data = await basitkargo.getBalance();
        return NextResponse.json({ success: true, data });
      }
      case "brands": {
        const data = await basitkargo.getBrands();
        return NextResponse.json({ success: true, data });
      }
      case "addresses": {
        const data = await basitkargo.getAddresses();
        return NextResponse.json({ success: true, data });
      }
      case "cities": {
        const data = await basitkargo.getCities();
        return NextResponse.json({ success: true, data });
      }
      case "towns": {
        const data = await basitkargo.getTowns(params.cityId);
        return NextResponse.json({ success: true, data });
      }
      case "neighborhoods": {
        const data = await basitkargo.getNeighborhoods(params.cityName, params.townName);
        return NextResponse.json({ success: true, data });
      }
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "API error" }, { status: 500 });
  }
}
