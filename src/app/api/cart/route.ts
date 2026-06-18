import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getDealerPrice } from "@/lib/dealer-pricing";
import { applyCampaigns } from "@/lib/campaign-engine";
import { formatPrice } from "@/lib/utils";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });
    }

    let cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: user.id },
        include: { items: { include: { product: true } } },
      });
    }

    let dealerDiscount = 0;
    let dealerGroup = "";
    let dealerId = "";
    if (user.dealerId) {
      const dealer = await prisma.dealer.findUnique({ where: { id: user.dealerId } });
      if (dealer) {
        dealerDiscount = dealer.discountRate;
        dealerGroup = dealer.group;
        dealerId = dealer.id;
      }
    }

    const items = await Promise.all(
      cart.items.map(async (item) => {
        if (dealerGroup) {
          const effectivePrice = await getDealerPrice(
            item.productId,
            item.product.price,
            dealerGroup,
            dealerDiscount,
            item.quantity,
            dealerId
          );
          return { ...item, product: { ...item.product, price: effectivePrice } };
        }
        return item;
      })
    );

    // Apply campaigns
    const cartTotal = items.reduce((s: number, i: any) => s + (i.product.price || 0) * i.quantity, 0);
    const campaigns = await applyCampaigns(
      items.map((i: any) => ({ productId: i.productId, quantity: i.quantity, price: i.product.price || 0 })),
      cartTotal,
      dealerGroup,
      dealerId,
      user.id,
    );

    return NextResponse.json({
      success: true,
      data: {
        items,
        dealerDiscount,
        isDealer: !!user.dealerId,
        total: cartTotal,
        campaigns: campaigns.map(c => ({ id: c.campaign.id, label: c.label, discount: c.discount, freeShipping: c.campaign.freeShipping })),
      },
    });
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

    const { productId, quantity = 1, variantId = "" } = await req.json();

    if (quantity < 1) {
      return NextResponse.json({ success: false, error: "Geçersiz adet" }, { status: 400 });
    }

    // Validate min order quantity
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    }
    if (quantity < product.minOrderQuantity) {
      return NextResponse.json({
        success: false,
        error: `Bu ürün için minimum sipariş adedi ${product.minOrderQuantity}`,
      }, { status: 400 });
    }

    let cart = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: user.id } });
    }

    const existing = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId },
    });

    const newQuantity = existing ? existing.quantity + quantity : quantity;
    if (newQuantity < product.minOrderQuantity) {
      return NextResponse.json({
        success: false,
        error: `Bu ürün için minimum sipariş adedi ${product.minOrderQuantity}`,
      }, { status: 400 });
    }

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, variantId, quantity },
      });
    }

    // Validate dealer min order amount
    if (user.dealerId) {
      const dealer = await prisma.dealer.findUnique({
        where: { id: user.dealerId },
        include: { dealerGroup: true },
      });
      if (dealer?.dealerGroup?.minOrderAmount && dealer.dealerGroup.minOrderAmount > 0) {
        const updated = await prisma.cart.findUnique({
          where: { userId: user.id },
          include: { items: { include: { product: true } } },
        });
        const cartTotal = updated?.items.reduce((s, i) => s + i.product.price * i.quantity, 0) || 0;
        if (cartTotal < dealer.dealerGroup.minOrderAmount) {
          return NextResponse.json({
            success: true,
            data: { items: updated?.items || [] },
            warning: `Minimum sipariş tutarı: ${formatPrice(dealer.dealerGroup.minOrderAmount)}`,
          });
        }
      }
    }

    const updated = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
    });

    return NextResponse.json({ success: true, data: { items: updated?.items || [] } });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const { itemId, quantity } = await req.json();
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
    });

    return NextResponse.json({ success: true, data: { items: cart?.items || [] } });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const { itemId } = await req.json();
    await prisma.cartItem.delete({ where: { id: itemId } });

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
    });

    return NextResponse.json({ success: true, data: { items: cart?.items || [] } });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
