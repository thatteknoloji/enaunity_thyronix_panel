import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateFeedXml } from "@/lib/thyronix/xml-generator";
import { mergeProducts } from "@/lib/thyronix/merge-engine";
import { getTemplate } from "@/lib/thyronix/templates";
import type { MergeStrategy } from "@/lib/thyronix/merge-engine";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const feed = await prisma.thyronixFeed.findUnique({ where: { id } });
    if (!feed) return new Response("Feed not found", { status: 404, headers: { "Content-Type": "text/plain" } });

    const template = getTemplate((feed as any).outputFormat || "jetteknoloji");
    if (!template) return new Response("Unknown template", { status: 400, headers: { "Content-Type": "text/plain" } });

    // Fetch all source products in chunks
    const sources = await prisma.thyronixSource.findMany({ where: { status: "active" } });
    const CHUNK = 2000;
    const sourceIds = sources.map(s => s.id);
    const allProducts: any[] = [];
    let cursor: string | undefined;

    while (true) {
      const chunk = await prisma.thyronixProduct.findMany({
        where: { sourceId: { in: sourceIds }, ...(cursor ? { id: { gt: cursor } } : {}) },
        orderBy: { id: "asc" },
        take: CHUNK,
      });
      if (chunk.length === 0) break;
      allProducts.push(...chunk);
      cursor = chunk[chunk.length - 1].id;
    }

    // Apply merge strategy
    const strategy = ((feed as any).mergeStrategy || "lowest_price") as MergeStrategy;
    const merged = mergeProducts(
      allProducts as any,
      strategy,
      strategy === "source_priority" ? sourceIds : [],
    );

    // Generate XML
    const productsWithVariants = merged.map(p => ({
      ...p,
      variants: [] as any[],
    }));

    const xml = generateFeedXml(productsWithVariants, template);

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch (e) {
    return new Response("Feed generation error", { status: 500, headers: { "Content-Type": "text/plain" } });
  }
}
