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

export function runGeoGate(ctx: GateDraftContext): PublishGateCheck[] {
  const checks: PublishGateCheck[] = [];
  const isGeoBlueprint = ctx.blueprintKind === "PRODUCT_GEO";

  checks.push(
    check(
      "country_language",
      "Ülke/Dil",
      !!ctx.draft.country && !!ctx.draft.language,
      "Ülke veya dil eksik",
      "Ülke/dil mevcut"
    )
  );

  const geoHints = ctx.aeo?.geoHints as { province?: string; district?: string; localQueryVariants?: string[] } | undefined;
  const hasLocation = !!(geoHints?.province || geoHints?.district || ctx.blueprintMetadata.geoPath);

  if (isGeoBlueprint) {
    checks.push(
      check(
        "geo_location",
        "GEO lokasyon",
        hasLocation,
        "PRODUCT_GEO blueprint ama lokasyon yok",
        "Lokasyon mevcut",
        { severity: "blocker", details: { geoPath: ctx.blueprintMetadata.geoPath } }
      )
    );
  }

  const variants = geoHints?.localQueryVariants?.length ?? 0;
  checks.push(
    check(
      "local_queries",
      "Local query variants",
      variants > 0 || !isGeoBlueprint,
      "Local query variants zayıf",
      "Local queries mevcut",
      { warn: isGeoBlueprint && variants === 0, severity: "warning", details: { count: variants } }
    )
  );

  checks.push(
    check(
      "geo_score",
      "GEO Score",
      ctx.draft.geoScore >= 50 || !isGeoBlueprint,
      "GEO score düşük",
      "GEO score yeterli",
      { warn: isGeoBlueprint && ctx.draft.geoScore < 50, severity: "warning", details: { geoScore: ctx.draft.geoScore } }
    )
  );

  if (ctx.projectCountry === "TR" && isGeoBlueprint && !geoHints?.province) {
    checks.push(
      check(
        "tr_province",
        "TR province",
        false,
        "TR projede province/district yok",
        "Province mevcut",
        { warn: true, severity: "warning" }
      )
    );
  }

  return checks;
}

export function geoGatePassed(checks: PublishGateCheck[]): boolean {
  return !checks.some((c) => c.status === "FAIL" && c.severity === "blocker");
}
