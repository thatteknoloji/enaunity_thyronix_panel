import type { PublishGateCheck } from "./gate-types";
import type { GateDraftContext } from "./gate-types";

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalizeText(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeText(b).split(" ").filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

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

export function runDuplicateGate(ctx: GateDraftContext): PublishGateCheck[] {
  const checks: PublishGateCheck[] = [];
  const d = ctx.draft;
  const siblings = ctx.siblingDrafts.filter((s) => s.id !== d.id);

  const slugDup = siblings.find((s) => s.slug === d.slug);
  checks.push(
    check(
      "slug_duplicate",
      "Slug duplicate",
      !slugDup,
      `Aynı slug: ${d.slug}`,
      "Slug benzersiz",
      { severity: "blocker", details: slugDup ? { otherDraftId: slugDup.id } : undefined }
    )
  );

  const h1Dup = siblings.find((s) => normalizeText(s.h1) === normalizeText(d.h1) && d.h1.trim());
  checks.push(
    check(
      "h1_duplicate",
      "H1 duplicate",
      !h1Dup,
      "Aynı H1 başka draftta var",
      "H1 benzersiz",
      { severity: h1Dup ? "blocker" : "info", details: h1Dup ? { otherDraftId: h1Dup.id } : undefined }
    )
  );

  const metaDup = siblings.find((s) => normalizeText(s.metaTitle) === normalizeText(d.metaTitle) && d.metaTitle.trim());
  checks.push(
    check(
      "metaTitle_duplicate",
      "Meta title duplicate",
      !metaDup,
      "Aynı meta title başka draftta var",
      "Meta title benzersiz",
      { severity: metaDup ? "blocker" : "info", details: metaDup ? { otherDraftId: metaDup.id } : undefined }
    )
  );

  let maxIntroSim = 0;
  let introMatchId: string | undefined;
  for (const s of siblings) {
    const sim = tokenOverlap(d.intro, s.intro);
    if (sim > maxIntroSim) {
      maxIntroSim = sim;
      introMatchId = s.id;
    }
  }
  checks.push(
    check(
      "intro_similarity",
      "Intro benzerliği",
      maxIntroSim < 0.95,
      "Intro neredeyse birebir aynı (≥0.95)",
      "Intro benzersiz",
      {
        warn: maxIntroSim >= 0.85 && maxIntroSim < 0.95,
        severity: maxIntroSim >= 0.95 ? "blocker" : maxIntroSim >= 0.85 ? "warning" : "info",
        details: { similarity: maxIntroSim, otherDraftId: introMatchId },
      }
    )
  );

  const headings = ctx.sections.map((s) => normalizeText(s.heading)).filter(Boolean);
  let sectionDup = false;
  for (const s of siblings) {
    try {
      const otherSections = JSON.parse(s.bodyJson || "[]") as Array<{ heading?: string }>;
      const otherHeadings = otherSections.map((x) => normalizeText(x.heading || "")).filter(Boolean);
      if (headings.length && headings.join("|") === otherHeadings.join("|")) {
        sectionDup = true;
        break;
      }
    } catch {
      /* skip */
    }
  }
  checks.push(
    check(
      "section_headings_duplicate",
      "Section başlıkları",
      !sectionDup,
      "Section başlıkları birebir aynı",
      "Section başlıkları farklı",
      { warn: sectionDup, severity: sectionDup ? "warning" : "info" }
    )
  );

  return checks;
}

export function duplicateGatePassed(checks: PublishGateCheck[]): boolean {
  return !checks.some((c) => c.status === "FAIL" && c.severity === "blocker");
}
