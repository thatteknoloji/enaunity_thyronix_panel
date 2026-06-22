import type { PublishGateCheck } from "./gate-types";
import type { GateDraftContext } from "./gate-types";

function check(
  key: string,
  label: string,
  ok: boolean,
  failMsg: string,
  passMsg: string,
  opts?: { warn?: boolean; score?: number; severity?: "info" | "warning" | "blocker"; details?: Record<string, unknown> }
): PublishGateCheck {
  const severity = opts?.severity || (ok ? "info" : opts?.warn ? "warning" : "blocker");
  return {
    key,
    label,
    status: ok ? "PASS" : opts?.warn ? "WARN" : "FAIL",
    score: opts?.score ?? (ok ? 100 : opts?.warn ? 60 : 0),
    message: ok ? passMsg : failMsg,
    details: opts?.details,
    severity,
  };
}

function slugClean(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function runSeoGate(ctx: GateDraftContext): PublishGateCheck[] {
  const d = ctx.draft;
  const checks: PublishGateCheck[] = [];

  checks.push(check("h1", "H1", !!d.h1?.trim(), "H1 eksik", "H1 mevcut", { severity: "blocker" }));
  checks.push(check("title", "Başlık", !!d.title?.trim(), "Başlık eksik", "Başlık mevcut"));
  checks.push(
    check(
      "metaTitle",
      "Meta Title uzunluğu",
      d.metaTitle.length >= 45 && d.metaTitle.length <= 70,
      "Meta title aralık dışı",
      "Meta title 45–70 karakter",
      { warn: d.metaTitle.length > 0, severity: d.metaTitle.length === 0 ? "blocker" : "warning", details: { length: d.metaTitle.length } }
    )
  );
  checks.push(
    check(
      "metaDescription",
      "Meta Description",
      d.metaDescription.length >= 120 && d.metaDescription.length <= 170,
      "Meta description eksik veya aralık dışı",
      "Meta description uygun",
      { warn: d.metaDescription.length > 0 && d.metaDescription.length < 120, severity: d.metaDescription.length === 0 ? "blocker" : "warning", details: { length: d.metaDescription.length } }
    )
  );
  checks.push(check("intro", "Intro", !!d.intro?.trim(), "Intro eksik", "Intro mevcut", { warn: !d.intro?.trim() }));
  checks.push(
    check(
      "sections",
      "Section sayısı",
      ctx.sections.length >= 5,
      "Section sayısı yetersiz (<3)",
      "Yeterli section",
      { warn: ctx.sections.length >= 3 && ctx.sections.length < 5, severity: ctx.sections.length < 3 ? "blocker" : "warning", details: { count: ctx.sections.length } }
    )
  );
  checks.push(
    check(
      "faq",
      "FAQ",
      ctx.faq.length >= 4,
      "FAQ yetersiz",
      "FAQ yeterli",
      { warn: ctx.faq.length > 0 && ctx.faq.length < 4, severity: "warning", details: { count: ctx.faq.length } }
    )
  );
  checks.push(
    check(
      "internalLinks",
      "Internal links",
      ctx.internalLinks.length >= 3,
      "Internal link yetersiz",
      "Internal link yeterli",
      { warn: ctx.internalLinks.length > 0 && ctx.internalLinks.length < 3, severity: "warning", details: { count: ctx.internalLinks.length } }
    )
  );
  checks.push(
    check("slug", "Slug", slugClean(d.slug), "Slug formatı geçersiz", "Slug temiz", { warn: !slugClean(d.slug), severity: "warning" })
  );
  checks.push(
    check(
      "publishScore",
      "Publish Score",
      d.publishScore >= 80,
      "Publish score düşük (<50)",
      "Publish score yeterli",
      { warn: d.publishScore >= 50 && d.publishScore < 80, severity: d.publishScore < 50 ? "blocker" : "warning", details: { publishScore: d.publishScore } }
    )
  );

  return checks;
}

export function seoGatePassed(checks: PublishGateCheck[]): boolean {
  return !checks.some((c) => c.status === "FAIL" && c.severity === "blocker");
}
