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

export function runAeoGate(ctx: GateDraftContext): PublishGateCheck[] {
  const aeo = ctx.aeo;
  const checks: PublishGateCheck[] = [];

  checks.push(
    check("aeo_payload", "AEO payload", !!aeo, "AEO metadata yok", "AEO metadata mevcut", { severity: "blocker" })
  );

  const quickAnswer = aeo?.answerBlocks
    ? (aeo.answerBlocks as Array<{ type: string }>).some((b) => b.type === "QUICK_ANSWER")
    : false;
  checks.push(
    check("quick_answer", "Quick Answer", quickAnswer, "Quick Answer yok", "Quick Answer mevcut", { severity: "blocker" })
  );

  const faqCount = aeo?.faqBlocks ? (aeo.faqBlocks as unknown[]).length : ctx.faq.length;
  checks.push(
    check(
      "aeo_faq",
      "AEO FAQ",
      faqCount >= 4,
      "FAQ yetersiz",
      "FAQ yeterli",
      { warn: faqCount > 0 && faqCount < 4, severity: "warning", details: { count: faqCount } }
    )
  );

  const schemaHints = aeo?.schemaHints ? (aeo.schemaHints as unknown[]).length : 0;
  checks.push(
    check(
      "schema_hints",
      "Schema hints",
      schemaHints > 0,
      "Schema hints zayıf",
      "Schema hints mevcut",
      { warn: schemaHints === 0, severity: "warning" }
    )
  );

  const citationHints = aeo?.citationHints ? (aeo.citationHints as unknown[]).length : 0;
  checks.push(
    check(
      "citation_hints",
      "Citation hints",
      citationHints > 0,
      "Citation hints yok",
      "Citation hints mevcut",
      { warn: citationHints === 0, severity: "warning" }
    )
  );

  checks.push(
    check(
      "aeo_score",
      "AEO Score",
      ctx.draft.aeoScore >= 70,
      "AEO score düşük (<50)",
      "AEO score yeterli",
      { warn: ctx.draft.aeoScore >= 50 && ctx.draft.aeoScore < 70, severity: ctx.draft.aeoScore < 50 ? "blocker" : "warning", details: { aeoScore: ctx.draft.aeoScore } }
    )
  );

  return checks;
}

export function aeoGatePassed(checks: PublishGateCheck[]): boolean {
  return !checks.some((c) => c.status === "FAIL" && c.severity === "blocker");
}
