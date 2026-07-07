import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse, withTenantFilter } from "@/lib/thyronix/access";
import { checkAiLicense } from "@/lib/thyronix/ai-license";
import { resolveDealerId } from "@/lib/thyronix/workspace";
import { applyAiContentBatch } from "@/lib/thyronix/rules/ai-content";
import { applyContentRulesToRow } from "@/lib/thyronix/rules/content-apply";
import { resolveRulesDealerId } from "@/lib/thyronix/rules/profile-service";
import { resolveRulesForSource } from "@/lib/thyronix/rules/resolver";
import { parseFieldLocks } from "@/lib/thyronix/field-lock";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = body.mode || "ai";

    if (mode === "template") {
      const user = await requireThyronixDealerOrAdmin();
      const dealerId = await resolveRulesDealerId(user, body.dealerId);
      const sourceId = body.sourceId as string | undefined;
      const limit = Math.min(Number(body.limit) || 500, 2000);

      const products = await prisma.thyronixProduct.findMany({
        where: {
          dealerId,
          ...(sourceId ? { sourceId } : {}),
        },
        select: {
          id: true,
          sourceId: true,
          name: true,
          description: true,
          brand: true,
          lockedFields: true,
        },
        take: limit,
      });

      let updated = 0;
      for (const p of products) {
        const rules = (await resolveRulesForSource(p.sourceId)).ai;
        const locks = parseFieldLocks(p.lockedFields);
        const row = applyContentRulesToRow(
          { name: p.name, description: p.description, brand: p.brand },
          rules,
          locks,
        );
        const data: Record<string, string | null> = {};
        if (!locks.name && row.name !== p.name) data.name = String(row.name);
        if (!locks.description && row.description !== p.description) {
          data.description = row.description != null ? String(row.description) : null;
        }
        if (Object.keys(data).length) {
          await prisma.thyronixProduct.update({ where: { id: p.id }, data });
          updated++;
        }
      }

      return NextResponse.json({
        success: true,
        data: { processed: products.length, updated, mode: "template" },
      });
    }

    const licenseError = checkAiLicense();
    if (licenseError) {
      return NextResponse.json({ error: licenseError.error }, { status: licenseError.status });
    }

    const user = await requireThyronixDealerOrAdmin();
    const dealerId = await resolveDealerId(user);
    const sourceId = body.sourceId as string | undefined;
    const fields = (body.fields as ("name" | "description")[]) || ["name", "description"];
    const maxItems = Math.min(Number(body.maxItems) || 30, 100);

    let productIds = (body.productIds as string[]) || [];
    if (!productIds.length && sourceId) {
      const rows = await prisma.thyronixProduct.findMany({
        where: withTenantFilter(user, { sourceId }),
        select: { id: true },
        take: maxItems,
        orderBy: { updatedAt: "desc" },
      });
      productIds = rows.map((r) => r.id);
    }
    if (!productIds.length && dealerId) {
      const rows = await prisma.thyronixProduct.findMany({
        where: { dealerId },
        select: { id: true },
        take: maxItems,
        orderBy: { updatedAt: "desc" },
      });
      productIds = rows.map((r) => r.id);
    }

    if (!productIds.length) {
      return NextResponse.json({ success: false, error: "İşlenecek ürün bulunamadı" }, { status: 400 });
    }

    const data = await applyAiContentBatch({
      productIds,
      dealerId,
      providerId: body.providerId,
      fields,
      maxItems,
    });

    return NextResponse.json({ success: true, data: { ...data, mode: "ai" } });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
