import type { PublishGateCheck } from "./gate-types";
import type { GateDraftContext } from "./gate-types";

function check(
  key: string,
  label: string,
  ok: boolean,
  failMsg: string,
  passMsg: string,
  opts?: { warn?: boolean; severity?: "info" | "warning" | "blocker"; details?: Record<string, unknown> }
): PublishGateCheck {
  return {
    key,
    label,
    status: ok ? "PASS" : opts?.warn ? "WARN" : "FAIL",
    score: ok ? 100 : opts?.warn ? 60 : 0,
    message: ok ? passMsg : failMsg,
    details: opts?.details,
    severity: opts?.severity || (ok ? "info" : opts?.warn ? "warning" : "blocker"),
  };
}

function findProductNode(schema: Record<string, unknown>): Record<string, unknown> | null {
  if (schema["@type"] === "Product") return schema;
  const graph = schema["@graph"];
  if (Array.isArray(graph)) {
    for (const node of graph) {
      if (node && typeof node === "object" && (node as Record<string, unknown>)["@type"] === "Product") {
        return node as Record<string, unknown>;
      }
    }
  }
  return null;
}

export function runSchemaGate(ctx: GateDraftContext): PublishGateCheck[] {
  const checks: PublishGateCheck[] = [];
  const schema = ctx.schemaDraft;

  checks.push(
    check(
      "schema_exists",
      "Schema JSON",
      Object.keys(schema).length > 0,
      "Schema JSON boş",
      "Schema JSON mevcut",
      { severity: "blocker" }
    )
  );

  const hasFaqPage = JSON.stringify(schema).includes("FAQPage");
  if (hasFaqPage) {
    checks.push(
      check(
        "faqpage_faq",
        "FAQPage + FAQ",
        ctx.faq.length >= 2,
        "FAQPage var ama FAQ yetersiz",
        "FAQPage ile FAQ uyumlu",
        { severity: "blocker", details: { faqCount: ctx.faq.length } }
      )
    );
  }

  const product = findProductNode(schema);
  if (product) {
    checks.push(
      check(
        "product_name",
        "Product schema name",
        !!product.name,
        "Product schema name eksik",
        "Product name mevcut",
        { severity: "blocker" }
      )
    );
    checks.push(
      check(
        "product_image",
        "Product schema image",
        !!product.image,
        "Product schema image yok",
        "Product image mevcut",
        { warn: !product.image, severity: "warning" }
      )
    );
    const offers = product.offers as Record<string, unknown> | undefined;
    if (offers?.price) {
      checks.push(
        check(
          "offer_currency",
          "Offer currency",
          !!offers.priceCurrency,
          "Price var ama currency yok",
          "Offer currency mevcut",
          { warn: !offers.priceCurrency, severity: "warning" }
        )
      );
    } else if (offers) {
      checks.push(
        check(
          "offer_complete",
          "Offer completeness",
          false,
          "Offers incomplete",
          "Offers complete",
          { warn: true, severity: "warning" }
        )
      );
    }
  }

  return checks;
}

export function schemaGatePassed(checks: PublishGateCheck[]): boolean {
  return !checks.some((c) => c.status === "FAIL" && c.severity === "blocker");
}
