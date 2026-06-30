import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getDealerPrice, checkDealerCredit, deductDealerBalance } from "@/lib/dealer-pricing";
import { notifyOrderCreated, createNotification } from "@/lib/notifications";
import { dispatchWebhook } from "@/lib/webhook";
import { createPaymentIntent } from "@/lib/payments/payment-service";
import {
  assertPaymentMethodAllowed,
  paymentDeadlineFromNow,
  resolveDealerPaymentMethods,
} from "@/lib/payments/payment-method-policy";
import { notifyBankTransferCreated } from "@/lib/payments/payment-deadline-worker";
import {
  resolveProviderKey,
  type ProductLibraryPaymentMethod,
} from "@/lib/payments/gateway-config";
import {
  calculatePaymentTotal,
  getPaymentSettings,
  getPublicPaymentSettings,
} from "@/lib/payments/payment-settings";
import { getSystemPaymentDealer } from "@/lib/payments/system-payment-dealer";
import {
  assertPaymentModeAllowed,
  buildCheckoutPaymentContext,
  buildOrderPaymentMetadata,
  roundMoney,
  type PaymentMode,
} from "@/lib/payments/checkout-payment-service";
import { recordCartActivity } from "@/lib/cart/cart-observer-service";

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

    const {
      address,
      company = "",
      taxId = "",
      invoiceAddress = "",
      deliveryAddress = "",
      sameAddress = false,
      couponId,
      discount,
      campaignDiscount: campaignDiscountInput = 0,
      campaignLabel: campaignLabelInput = "",
      campaignFreeShip: campaignFreeShipInput = false,
      paymentTermDays,
      paymentTermRate,
      attachments,
      platform,
      shippingCost = 0,
      paymentMethod,
      paymentMode: paymentModeInput,
      installmentCount = 1,
    } = await req.json();

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
    const isAdminCheckout = user.role === "admin";
    const userPhone = (user as { phone?: string }).phone || "5550000000";

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

    const campaignDiscount = Math.max(0, Number(campaignDiscountInput) || 0);
    const campaignLabel = String(campaignLabelInput || "");
    const campaignFreeShip = Boolean(campaignFreeShipInput);
    const totalDiscount = Math.min(total, finalDiscount + campaignDiscount);
    const subTotal = total - totalDiscount;
    const termFee = (paymentTermRate && paymentTermRate > 0) ? total * (paymentTermRate / 100) : 0;
    const shipping = typeof shippingCost === "number" && shippingCost > 0 ? shippingCost : 0;
    const finalTotal = subTotal + termFee + (campaignFreeShip ? 0 : shipping);

    const method = (paymentMethod || "DEALER_ACCOUNT") as ProductLibraryPaymentMethod | "DEALER_ACCOUNT" | "SPLIT";
    const paymentModeRaw = (paymentModeInput || "") as PaymentMode | "";
    let paymentMode: PaymentMode | null = null;
    let checkoutCtx = null;

    if (dealer) {
      const resolvedMethods = await resolveDealerPaymentMethods(dealer.id);
      const cardAvailable = resolvedMethods.methods.some((m) => m === "ESNEKPOS" || m === "IYZICO");
      checkoutCtx = await buildCheckoutPaymentContext({
        dealerId: dealer.id,
        cartTotal: finalTotal,
        balanceEnabled: resolvedMethods.balanceEnabled,
        cardAvailable,
      });

      if (paymentModeRaw) {
        paymentMode = paymentModeRaw;
      } else if (method === "DEALER_ACCOUNT") {
        paymentMode = "BALANCE_ONLY";
      } else if (method === "SPLIT") {
        paymentMode = "SPLIT";
      } else if (method === "ESNEKPOS" || method === "IYZICO") {
        paymentMode = "CARD_ONLY";
      }

      if (paymentMode) {
        const allowedMode = assertPaymentModeAllowed(checkoutCtx, paymentMode);
        if (!allowedMode.ok) {
          return NextResponse.json({
            success: false,
            error: allowedMode.error,
            code: paymentMode === "BALANCE_ONLY" ? "INSUFFICIENT_BALANCE" : "PAYMENT_MODE_DENIED",
            checkout: checkoutCtx,
          }, { status: 400 });
        }
      }
    }

    const useGatewayPayment =
      paymentMode === "CARD_ONLY" ||
      paymentMode === "SPLIT" ||
      (method !== "DEALER_ACCOUNT" && method !== "SPLIT" && (dealer || isAdminCheckout));
    const isCard =
      paymentMode === "CARD_ONLY" ||
      paymentMode === "SPLIT" ||
      method === "ESNEKPOS" ||
      method === "IYZICO";
    const gatewayMethod: ProductLibraryPaymentMethod | "DEALER_ACCOUNT" | "SPLIT" =
      paymentMode === "SPLIT"
        ? "SPLIT"
        : paymentMode === "CARD_ONLY"
          ? ((method === "IYZICO" ? "IYZICO" : "ESNEKPOS") as ProductLibraryPaymentMethod)
          : method;

    if (dealer && paymentMode !== "BALANCE_ONLY") {
      const allowed = await assertPaymentMethodAllowed(
        dealer.id,
        gatewayMethod === "SPLIT" ? "ESNEKPOS" : (gatewayMethod as ProductLibraryPaymentMethod)
      );
      if (!allowed.ok) {
        return NextResponse.json({
          success: false,
          error: allowed.error,
          alternatives: allowed.alternatives,
          code: "PAYMENT_METHOD_DENIED",
        }, { status: 400 });
      }
    }

    if (isAdminCheckout && useGatewayPayment) {
      const publicSettings = await getPublicPaymentSettings();
      if (!publicSettings.methods.includes(gatewayMethod as ProductLibraryPaymentMethod) && gatewayMethod !== "SPLIT") {
        return NextResponse.json({
          success: false,
          error: "Seçilen ödeme yöntemi bu hesap için kullanılamıyor.",
          alternatives: publicSettings.methods,
          code: "PAYMENT_METHOD_DENIED",
        }, { status: 400 });
      }
    }

    if (useGatewayPayment && dealer && paymentMode !== "BALANCE_ONLY") {
      const allowed = await assertPaymentMethodAllowed(
        dealer.id,
        gatewayMethod === "SPLIT" ? "ESNEKPOS" : (gatewayMethod as ProductLibraryPaymentMethod)
      );
      if (!allowed.ok) {
        return NextResponse.json({
          success: false,
          error: allowed.error,
          alternatives: allowed.alternatives,
          code: "PAYMENT_METHOD_DENIED",
        }, { status: 400 });
      }
    }

    if (dealer && paymentMode === "BALANCE_ONLY") {
      const creditCheck = await checkDealerCredit(dealer.id, finalTotal);
      if (!creditCheck.ok) {
        const resolved = await resolveDealerPaymentMethods(dealer.id);
        const cardAvailable = resolved.methods.some((m) => m === "ESNEKPOS" || m === "IYZICO");
        const ctx = checkoutCtx || await buildCheckoutPaymentContext({
          dealerId: dealer.id,
          cartTotal: finalTotal,
          balanceEnabled: resolved.balanceEnabled,
          cardAvailable,
        });
        return NextResponse.json({
          success: false,
          error: creditCheck.message,
          alternatives: ctx.methods,
          suggestOnlinePayment: ctx.methods.includes("CARD_ONLY") || ctx.methods.includes("SPLIT"),
          code: "INSUFFICIENT_BALANCE",
          checkout: ctx,
        }, { status: 400 });
      }
    }

    let orderStatus = dealer ? "pending_approval" : "pending";
    if (useGatewayPayment) {
      orderStatus = "waiting_payment";
    }

    let hasBackorder = false;
    for (const item of itemDetails) {
      if (item.product.backorderable && item.product.stock < item.quantity) {
        hasBackorder = true;
        break;
      }
    }

    const paymentMeta =
      dealer && paymentMode && checkoutCtx
        ? buildOrderPaymentMetadata({
            mode: paymentMode,
            cartTotal: finalTotal,
            balancePortion:
              paymentMode === "BALANCE_ONLY"
                ? finalTotal
                : paymentMode === "SPLIT"
                  ? checkoutCtx.split.balancePortion
                  : 0,
            cardPortion:
              paymentMode === "CARD_ONLY"
                ? finalTotal
                : paymentMode === "SPLIT"
                  ? checkoutCtx.split.cardPortion
                  : 0,
            gateway: isCard ? "ESNEKPOS" : "",
          })
        : null;

    const metadataJson = JSON.stringify({
      platform: platform || "",
      company,
      taxId,
      invoiceAddress,
      deliveryAddress: deliveryAddress || invoiceAddress || "",
      sameAddress: Boolean(sameAddress),
      couponId: couponId || null,
      couponDiscount: finalDiscount,
      campaignDiscount,
      campaignLabel,
      campaignFreeShip,
      shippingCost: campaignFreeShip ? 0 : shipping,
      paymentMethod: gatewayMethod,
      paymentMode: paymentMode || null,
      installmentCount: useGatewayPayment ? installmentCount : undefined,
      rawTotal: total,
      discountTotal: totalDiscount,
      termFee,
      finalTotal,
      payment: paymentMeta,
    });

    const paymentDeadlineAt = useGatewayPayment && gatewayMethod === "BANK_TRANSFER" ? paymentDeadlineFromNow() : null;

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        dealerId: dealer?.id || null,
        total: finalTotal,
        discount: totalDiscount,
        couponId: couponId || null,
        hasBackorder,
        paymentTermDays: paymentTermDays || 0,
        paymentTermRate: paymentTermRate || 0,
        address,
        marketplace: platform || "",
        sourceType: "B2B",
        metadataJson,
        status: orderStatus,
        paymentDeadlineAt,
        attachments: attachments?.length > 0 ? {
          create: attachments.map((att: { fileName: string; fileUrl: string; fileType: string; fileSize?: number }) => ({
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
            note: useGatewayPayment
              ? "Online ödeme bekleniyor"
              : hasBackorder
                ? "Bazı ürünler ön sipariş"
                : (dealer ? "Sipariş onay bekliyor" : "Sipariş oluşturuldu"),
            changedBy: dealer ? "dealer" : "user",
          },
        },
      },
      include: { items: { include: { product: true } } },
    });

    await recordCartActivity({
      cartId: cart.id,
      userId: user.id,
      dealerId: dealer?.id || user.dealerId || null,
      eventType: "checkout_completed",
      quantityBefore: itemDetails.reduce((sum, item) => sum + item.quantity, 0),
      quantityAfter: 0,
      snapshot: {
        cartItemCount: itemDetails.length,
        cartTotalSnapshot: finalTotal,
      },
      metadata: {
        orderId: order.id,
        paymentMethod: gatewayMethod,
        paymentMode: paymentMode || null,
        status: orderStatus,
        finalTotal,
        platform: platform || "",
      },
    });

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    void dispatchWebhook("order.created", {
      orderId: order.id,
      orderNo: order.id.slice(0, 8).toUpperCase(),
      total: finalTotal,
      status: orderStatus,
      dealerId: dealer?.id,
      dealerName: dealer?.name,
      itemCount: itemDetails.length,
      platform: platform || "",
      createdAt: order.createdAt.toISOString(),
    });

    if (dealer && paymentMode === "BALANCE_ONLY") {
      await deductDealerBalance(dealer.id, finalTotal - termFee, order.id, "ORDER_COST", "Sipariş kesintisi");
      if (termFee > 0) {
        await deductDealerBalance(dealer.id, termFee, order.id, "SERVICE_FEE", `Vade farkı (%${paymentTermRate})`);
      }
    }

    if (!dealer && !useGatewayPayment) {
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

    if (useGatewayPayment) {
      const paymentOwnerDealer = dealer || await getSystemPaymentDealer({
        email: user.email,
        name: user.name,
        phone: userPhone,
      });
      let payAmount = paymentMode === "SPLIT" && checkoutCtx
        ? checkoutCtx.split.cardPortion
        : finalTotal;
      const cardProvider =
        gatewayMethod === "IYZICO"
          ? "IYZICO"
          : ((await getPublicPaymentSettings()).activeCardProvider === "IYZICO" ? "IYZICO" : "ESNEKPOS");
      const providerKey = resolveProviderKey(
        (gatewayMethod === "SPLIT" ? cardProvider : gatewayMethod) as ProductLibraryPaymentMethod
      );
      if (isCard) {
        const settings = await getPaymentSettings();
        payAmount = calculatePaymentTotal(
          payAmount,
          cardProvider,
          settings
        ).totalAmount;
      }

      const result = await createPaymentIntent({
        dealerId: paymentOwnerDealer.id,
        moduleKey: "B2B_ORDER",
        planKey: order.id,
        amount: payAmount,
        currency: "TRY",
        paymentType: isCard ? "CARD" : "MANUAL",
        providerKey,
        metadata: {
          buyer: dealer
            ? {
                id: dealer.id,
                name: dealer.name || dealer.company || "Bayi",
                email: dealer.email || user.email || "",
                phone: dealer.phone || "5550000000",
              }
            : {
                id: user.id,
                name: user.name || "Admin",
                email: user.email || "",
                phone: userPhone,
              },
          installmentCount,
          orderId: order.id,
        },
      });

      if (!result.success) {
        await prisma.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
        return NextResponse.json({ success: false, error: result.message || "Ödeme başlatılamadı" }, { status: 400 });
      }

      if (dealer) {
        void notifyOrderCreated(
          dealer.id,
          order.id,
          finalTotal,
          dealer.email,
          dealer.name,
          itemDetails.map((item) => ({ name: item.product.name, qty: item.quantity, price: item.effectivePrice })),
          dealer.phone
        ).catch(() => {});
      } else {
        void createNotification({
          userId: user.id,
          title: "Sipariş Alındı",
          message: `#${order.id.slice(0, 8)} nolu siparişiniz alındı.`,
          type: "order",
          link: `/admin/orders/${order.id}`,
        }).catch(() => {});
      }

      if (gatewayMethod === "BANK_TRANSFER") {
        if (dealer) {
          void notifyBankTransferCreated({
            dealerId: dealer.id,
            title: "Havale/EFT — dekont yükleyin",
            message: `#${order.id.slice(0, 8)} nolu sipariş için havale yaptıktan sonra dekont yüklemeniz zorunludur. 24 saat içinde yüklenmezse sipariş iptal edilir.`,
            link: `/dealer/orders/${order.id}`,
          }).catch(() => {});
        } else {
          void createNotification({
            userId: user.id,
            title: "Havale/EFT — dekont bekleniyor",
            message: `#${order.id.slice(0, 8)} nolu sipariş için havale yaptıktan sonra dekont yükleyebilirsiniz.`,
            type: "payment",
            link: `/admin/orders/${order.id}`,
          }).catch(() => {});
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          order,
          paymentId: result.paymentId,
          redirectUrl: result.redirectUrl || null,
          status: result.status,
          paymentMethod: gatewayMethod,
          paymentMode,
          requiresReceipt: gatewayMethod === "BANK_TRANSFER",
        },
      }, { status: 201 });
    }

    if (dealer) {
      void notifyOrderCreated(
        dealer.id, order.id, finalTotal, dealer.email, dealer.name,
        itemDetails.map((item) => ({ name: item.product.name, qty: item.quantity, price: item.effectivePrice })),
        dealer.phone
      ).catch(() => {});
    } else {
      void createNotification({
        userId: user.id,
        title: "Sipariş Alındı",
        message: `#${order.id.slice(0, 8)} nolu siparişiniz alındı.`,
        type: "order",
        link: `/dealer/orders/${order.id}`,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sunucu hatası";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
