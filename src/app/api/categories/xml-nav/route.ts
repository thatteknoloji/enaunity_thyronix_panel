import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildCategoryNavTree } from "@/lib/categories/tree";
import {
  ensureXmlProductsRoot,
  XML_PRODUCTS_ROOT_SLUG,
} from "@/lib/products/xml-feed/category-mapper";

export async function GET() {
  let root = await prisma.category.findUnique({ where: { slug: XML_PRODUCTS_ROOT_SLUG } });
  if (!root) {
    root = await ensureXmlProductsRoot();
  }

  const tree = await buildCategoryNavTree(root.id);
  return NextResponse.json({ success: true, data: tree });
}
