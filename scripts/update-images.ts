import { prisma } from "../src/lib/db";

function img(seed: string, i: number) {
  return `https://picsum.photos/seed/${seed}${i}/600/800`;
}

async function main() {
  const products = await prisma.product.findMany();
  let updated = 0;

  for (const product of products) {
    const seed = product.id.slice(-8).replace(/[^a-zA-Z0-9]/g, "x");
    const image = img(seed, 1);
    const images = JSON.stringify([img(seed, 1), img(seed, 2), img(seed, 3), img(seed, 4)]);

    await prisma.product.update({
      where: { id: product.id },
      data: { image, images },
    });
    updated++;
  }

  console.log(`Done. Updated ${updated} products.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
