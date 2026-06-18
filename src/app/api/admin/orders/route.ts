import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addDealerBalance } from "@/lib/dealer-pricing";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const minAmount = searchParams.get("minAmount");
    const maxAmount = searchParams.get("maxAmount");
    const sort = searchParams.get("sort") || "date-desc"; // date-desc, date-asc, amount-desc, amount-asc
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};
    const OR: any[] = [];

    if (search) {
      OR.push(
        { id: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { dealer: { company: { contains: search } } },
        { dealer: { name: { contains: search } } },
      );
    }

    if (status && status !== "all") {
      where.OR = [
        { status },
        { fulfillmentStatus: status },
      ];
    }
    const fulfillmentStatus = searchParams.get("fulfillmentStatus");
    if (fulfillmentStatus) where.fulfillmentStatus = fulfillmentStatus;
    const sourceType = searchParams.get("sourceType");
    if (sourceType) where.sourceType = sourceType;
    if (fromDate) where.createdAt = { ...(where.createdAt || {}), gte: new Date(fromDate) };
    if (toDate) where.createdAt = { ...(where.createdAt || {}), lte: new Date(toDate + "T23:59:59.999Z") };
    if (minAmount) where.total = { ...(where.total || {}), gte: parseFloat(minAmount) };
    if (maxAmount) where.total = { ...(where.total || {}), lte: parseFloat(maxAmount) };
    if (OR.length > 0) where.OR = OR;

    const orderBy: any = {};
    switch (sort) {
      case "date-asc": orderBy.createdAt = "asc"; break;
      case "amount-desc": orderBy.total = "desc"; break;
      case "amount-asc": orderBy.total = "asc"; break;
      default: orderBy.createdAt = "desc";
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true } },
          user: { select: { name: true, email: true } },
          dealer: { select: { id: true, company: true, name: true } },
          statusHistory: { orderBy: { createdAt: "asc" } },
          attachments: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { ids, action } = await req.json();

    if (!ids?.length || !["approve", "cancel", "ship"].includes(action)) {
      return NextResponse.json({ success: false, error: "Geçersiz istek" }, { status: 400 });
    }

    const statusMap: Record<string, string> = { approve: "approved", cancel: "cancelled", ship: "shipped" };
    const newStatus = statusMap[action];
    const noteMap: Record<string, string> = { approve: "Toplu onaylandı", cancel: "Toplu iptal edildi", ship: "Toplu kargoya verildi" };

    for (const id of ids) {
      const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
      if (!order) continue;

      // Stock deduction on batch approve
      if (action === "approve" && order.status === "pending_approval") {
        const stockItems = order.items.filter((item) => item.productId);
        await Promise.all(stockItems.map((item) =>
          prisma.stockMovement.create({ data: { productId: item.productId!, type: "exit", quantity: item.quantity, note: `Toplu onay #${id.slice(0, 8)}`, orderId: id } })
        ));
        await Promise.all(stockItems.map((item) =>
          prisma.product.update({ where: { id: item.productId! }, data: { stock: { decrement: item.quantity } } })
        ));
      }

      // Stock return + balance refund on batch cancel
      if (action === "cancel" && order.status !== "cancelled") {
        if (order.status !== "pending_approval") {
          const stockItems = order.items.filter((item) => item.productId);
          await Promise.all(stockItems.map((item) =>
            prisma.stockMovement.create({ data: { productId: item.productId!, type: "return", quantity: item.quantity, note: `Toplu iptal #${id.slice(0, 8)}`, orderId: id } })
          ));
          await Promise.all(stockItems.map((item) =>
            prisma.product.update({ where: { id: item.productId! }, data: { stock: { increment: item.quantity } } })
          ));
        }
        if (order.dealerId) await addDealerBalance(order.dealerId, order.total);
      }

      await prisma.order.update({
        where: { id },
        data: {
          status: newStatus,
          statusHistory: { create: { status: newStatus, note: noteMap[action], changedBy: "admin" } },
        },
      });
    }

    return NextResponse.json({ success: true, data: { count: ids.length } });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
