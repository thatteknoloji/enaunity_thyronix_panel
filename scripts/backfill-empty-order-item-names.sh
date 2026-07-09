#!/usr/bin/env bash
# Boş OrderItem.name/sku/barcode alanlarını Product kaydından doldurur.
# Sunucuda: bash scripts/backfill-empty-order-item-names.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.production ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
elif [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

node --input-type=module <<'EOF'
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const emptyItems = await prisma.orderItem.findMany({
  where: {
    name: "",
    productId: { not: null },
  },
  select: { id: true, productId: true, orderId: true, metadataJson: true },
});

console.log(`Empty-named items: ${emptyItems.length}`);

let updated = 0;
for (const item of emptyItems) {
  if (!item.productId) continue;
  const product = await prisma.product.findUnique({
    where: { id: item.productId },
    select: { name: true, sku: true, barcode: true, image: true, costPrice: true },
  });
  if (!product?.name) {
    console.log(`skip ${item.id} — product missing`);
    continue;
  }

  let meta = {};
  try {
    meta = JSON.parse(item.metadataJson || "{}");
  } catch {
    meta = {};
  }
  if (!meta.imageUrl && product.image) meta.imageUrl = product.image;

  await prisma.orderItem.update({
    where: { id: item.id },
    data: {
      name: product.name,
      sku: product.sku || "",
      barcode: product.barcode || "",
      costPrice: Number(product.costPrice) || 0,
      metadataJson: JSON.stringify(meta),
    },
  });
  updated++;
  console.log(`✓ ${item.orderId.slice(0, 12)}… → ${product.name}`);
}

// Fill blank customerName from dealer company for B2B waiting_payment
const blankCustomer = await prisma.order.findMany({
  where: {
    sourceType: "B2B",
    customerName: "",
    dealerId: { not: null },
  },
  select: { id: true, dealerId: true, address: true },
});

let customerUpdated = 0;
for (const order of blankCustomer) {
  if (!order.dealerId) continue;
  const dealer = await prisma.dealer.findUnique({
    where: { id: order.dealerId },
    select: { name: true, company: true, phone: true, location: true },
  });
  if (!dealer) continue;
  await prisma.order.update({
    where: { id: order.id },
    data: {
      customerName: dealer.company || dealer.name || "",
      customerPhone: dealer.phone || "",
      customerCity: dealer.location || "",
    },
  });
  customerUpdated++;
}

console.log(`Done. items=${updated}, customerName=${customerUpdated}`);
await prisma.$disconnect();
EOF
