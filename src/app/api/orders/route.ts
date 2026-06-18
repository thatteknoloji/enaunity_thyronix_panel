import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getDealerPrice, checkDealerCredit, deductDealerBalance } from "@/lib/dealer-pricing";
import { notifyOrderCreated, createNotification } from "@/lib/notifications";
import { dispatchWebhook } from "@/lib/webhook";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: orders });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const { address, couponId, discount, paymentTermDays, paymentTermRate, attachments } = await req.json();

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ success: false, error: "Sepetin boş" }, { status: 400 });
    }

    const dealer = user.dealerId
      ? await prisma.dealer.findUnique({ where: { id: user.dealerId } })
      : null;

    const itemDetails = await Promise.all(
      cart.items.map(async (item) => {
        const product = item.product;
        if (dealer && item.quantity < product.minOrderQuantity) {
          throw new Error(`${product.name} için minimum sipariş adedi: ${product.minOrderQuantity}`);
        }
        const effectivePrice = dealer
          ? await getDealerPrice(product.id, product.price, dealer.group, dealer.discountRate, item.quantity, dealer.id)
          : product.price;
        return { ...item, effectivePrice };
      })
    );

    const total = itemDetails.reduce((sum, item) => sum + item.effectivePrice * item.quantity, 0);

    let finalDiscount = 0;
    if (couponId && discount) {
      const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
      if (!coupon || !coupon.active || (coupon.expiresAt && new Date() > coupon.expiresAt) || (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit)) {
        return NextResponse.json({ success: false, error: "Kupon geçersiz" }, { status: 400 });
      }
      if (total < coupon.minAmount) {
        return NextResponse.json({ success: false, error: `Minimum sepet tutarı: ${coupon.minAmount} TL` }, { status: 400 });
      }
      finalDiscount = Math.min(discount, total);
      await prisma.coupon.update({ where: { id: couponId }, data: { usageCount: { increment: 1 } } });
    }

    const subTotal = total - finalDiscount;
    const termFee = (paymentTermRate && paymentTermRate > 0) ? subTotal * (paymentTermRate / 100) : 0;
    const finalTotal = subTotal + termFee;

    if (dealer) {
      const creditCheck = await checkDealerCredit(dealer.id, finalTotal);
      if (!creditCheck.ok) {
        return NextResponse.json({ success: false, error: creditCheck.message }, { status: 400 });
      }
    }

    const orderStatus = dealer ? "pending_approval" : "pending";

    // Check for backordered items
    let hasBackorder = false;
    for (const item of itemDetails) {
      if (item.product.backorderable && item.product.stock < item.quantity) {
        hasBackorder = true;
        break;
      }
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        dealerId: dealer?.id || null,
        total: finalTotal,
        discount: finalDiscount,
        couponId: couponId || null,
        hasBackorder,
        paymentTermDays: paymentTermDays || 0,
        paymentTermRate: paymentTermRate || 0,
        address,
        status: orderStatus,
        attachments: attachments?.length > 0 ? {
          create: attachments.map((att: any) => ({
            fileName: att.fileName, fileUrl: att.fileUrl, fileType: att.fileType, fileSize: att.fileSize || 0,
          })),
        } : undefined,
        items: {
          create: itemDetails.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.effectivePrice,
          })),
        },
        statusHistory: {
          create: {
            status: orderStatus,
            note: hasBackorder ? "Bazı ürünler ön sipariş" : (dealer ? "Sipariş onay bekliyor" : "Sipariş oluşturuldu"),
            changedBy: dealer ? "dealer" : "user",
          },
        },
      },
      include: { items: { include: { product: true } } },
    });

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Fire webhooks
    dispatchWebhook("order.created", {
      orderId: order.id,
      orderNo: order.id.slice(0, 8).toUpperCase(),
      total: finalTotal,
      status: orderStatus,
      dealerId: dealer?.id,
      dealerName: dealer?.name,
      itemCount: itemDetails.length,
      createdAt: order.createdAt.toISOString(),
    });

    // Deduct dealer balance
    if (dealer) {
      await deductDealerBalance(dealer.id, finalTotal - termFee, order.id, "ORDER_COST", "Sipariş kesintisi");
      if (termFee > 0) {
        await deductDealerBalance(dealer.id, termFee, order.id, "SERVICE_FEE", `Vade farkı (%${paymentTermRate})`);
      }
    }

    // Stock deduction only for non-dealer orders (auto-approved)
    if (!dealer) {
      await Promise.all(
        itemDetails.map(async (item) => {
          const deductQty = item.product.backorderable
            ? Math.min(item.quantity, item.product.stock)
            : item.quantity;

          if (deductQty > 0) {
            await prisma.stockMovement.create({
              data: {
                productId: item.productId,
                type: "exit",
                quantity: deductQty,
                note: `Sipariş #${order.id.slice(0, 8)}${deductQty < item.quantity ? " (kısmi)" : ""}`,
                orderId: order.id,
              },
            });

            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: deductQty } },
            });
          }
        })
      );
    }

    if (dealer) {
      await notifyOrderCreated(
        dealer.id, order.id, finalTotal, dealer.email, dealer.name,
        itemDetails.map((item) => ({ name: item.product.name, qty: item.quantity, price: item.effectivePrice })),
        dealer.phone
      );
    } else {
      await createNotification({
        userId: user.id,
        title: "Sipariş Alındı",
        message: `#${order.id.slice(0, 8)} nolu siparişiniz alındı.`,
        type: "order",
        link: `/dealer/orders/${order.id}`,
      });
    }

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sunucu hatası";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
