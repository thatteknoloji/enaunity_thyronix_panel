#!/usr/bin/env bash
# Dünkü yanlış sınıflandırılmış B2B siparişleri düzeltir (sqlite3 gerekmez).
# Kullanım (sunucuda):
#   cd /opt/enaunity && bash scripts/fix-yesterday-order-classification.sh
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

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "✗ DATABASE_URL yok (.env.production / .env.local)"
  exit 1
fi

node --input-type=module <<'EOF'
import { PrismaClient } from "@prisma/client";

const targets = ["cmrc95l5", "cmrc8z2v"];
const prisma = new PrismaClient();

const where = {
  OR: targets.flatMap((t) => [
    { id: { startsWith: t } },
    { orderNumber: t },
  ]),
};

const before = await prisma.order.findMany({
  where,
  select: { id: true, orderNumber: true, sourceType: true, marketplace: true, status: true },
});
console.log("BEFORE:", JSON.stringify(before, null, 2));

const updated = await prisma.order.updateMany({
  where,
  data: { sourceType: "B2B" },
});
console.log("UPDATED:", updated.count);

const after = await prisma.order.findMany({
  where,
  select: { id: true, orderNumber: true, sourceType: true, marketplace: true, status: true },
});
console.log("AFTER:", JSON.stringify(after, null, 2));

if (after.length === 0) {
  console.log("Done: eşleşen sipariş yok.");
} else if (after.every((o) => o.sourceType === "B2B")) {
  console.log("Done: siparişler B2B olarak işaretli.");
} else {
  console.error("Warn: bazı satırlar hâlâ B2B değil.");
  process.exitCode = 1;
}

await prisma.$disconnect();
EOF
