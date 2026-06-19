import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";
import { createThyronixBulkJob, type BulkScope } from "@/lib/thyronix/bulk-job-worker";
import type { ThyronixProductFilters } from "@/lib/thyronix/product-query";

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const body = await req.json();
    const {
      action,
      ids,
      scope = "ids",
      filters = {},
      value,
      type,
      mode,
      category,
      brand,
    } = body as {
      action: string;
      ids?: string[];
      scope?: BulkScope;
      filters?: ThyronixProductFilters;
      value?: string;
      type?: string;
      mode?: string;
      category?: string;
      brand?: string;
    };

    if (!action) {
      return NextResponse.json({ success: false, error: "İşlem gerekli" }, { status: 400 });
    }

    if (scope === "ids" && !ids?.length) {
      return NextResponse.json({ success: false, error: "Ürün ID listesi gerekli" }, { status: 400 });
    }

    if (action === "apply_rules") {
      const { resolveBulkProductIds } = await import("@/lib/thyronix/bulk-job-worker");
      const allowedIds = await resolveBulkProductIds(user, scope, ids, filters);
      if (allowedIds.length === 0) {
        return NextResponse.json({ success: false, error: "Yetkisiz veya geçersiz ürün" }, { status: 403 });
      }

      let updated = 0;
      const rules = await prisma.thyronixRule.findMany({
        where: withTenantFilter(user, { status: "active" }),
      });

      for (const id of allowedIds) {
        const product = await prisma.thyronixProduct.findUnique({ where: { id } });
        if (!product) continue;
        const update: Record<string, unknown> = {};
        for (const rule of rules) {
          const fieldVal = (product as Record<string, unknown>)[rule.field];
          let matches = false;
          switch (rule.operator) {
            case "lt": matches = Number(fieldVal) < parseFloat(rule.value); break;
            case "gt": matches = Number(fieldVal) > parseFloat(rule.value); break;
            case "eq": matches = String(fieldVal) === rule.value; break;
            case "contains": matches = String(fieldVal || "").toLowerCase().includes(rule.value.toLowerCase()); break;
            case "empty": matches = !fieldVal; break;
          }
          if (matches) {
            switch (rule.action) {
              case "setStatus": if (rule.actionValue) update.status = rule.actionValue; break;
              case "adjustPrice": if (rule.actionValue) update.price = parseFloat(rule.actionValue); break;
              case "setStock": if (rule.actionValue) update.stock = parseInt(rule.actionValue); break;
              case "exclude": update.status = "excluded"; break;
            }
          }
        }
        if (Object.keys(update).length > 0) {
          await prisma.thyronixProduct.update({ where: { id }, data: update });
          updated++;
        }
      }
      return NextResponse.json({
        success: true,
        data: { updated, total: allowedIds.length, remaining: 0 },
      });
    }

    const result = await createThyronixBulkJob({
      user,
      scope,
      ids,
      filters,
      params: { action, value, type, mode, category, brand },
    });

    return NextResponse.json({
      success: true,
      data: {
        updated: result.updated,
        total: result.total,
        remaining: result.remaining,
        jobId: result.jobId,
        inline: result.inline,
        status: result.status || "completed",
        message: result.message || `${result.updated} ürün güncellendi`,
      },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
