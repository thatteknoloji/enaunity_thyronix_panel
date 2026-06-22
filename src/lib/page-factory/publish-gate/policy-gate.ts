import type { PublishGateCheck } from "./gate-types";
import type { GateDraftContext } from "./gate-types";
import { BANNED_PHRASES } from "@/lib/aeo/aeo-utils";

const HEALTH_CLAIMS = [/tedavi eder/i, /hastalığı iyileştirir/i, /kesin çözüm/i, /%100 şifa/i];
const FINANCE_CLAIMS = [/garantili getiri/i, /kesin kazanç/i, /risk[s]?iz yatırım/i];
const LEGAL_CLAIMS = [/kesin kazanır/i, /mahkeme garantisi/i, /hukuki garanti/i];

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

function scanText(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    if (p.test(text)) return p.source;
  }
  return null;
}

export function runPolicyGate(ctx: GateDraftContext): PublishGateCheck[] {
  const checks: PublishGateCheck[] = [];
  const corpus = [
    ctx.draft.h1,
    ctx.draft.intro,
    ctx.draft.metaDescription,
    ...ctx.sections.map((s) => s.content + " " + s.heading),
    ...ctx.faq.map((f) => f.question + " " + f.answer),
  ].join(" ");

  const cat = (ctx.blueprintMetadata.categoryPath as string || "").toLowerCase();
  const isSensitive = ["sağlık", "tıbbi", "ilaç", "hukuk", "finans", "kredi"].some((s) => cat.includes(s));

  for (const phrase of BANNED_PHRASES) {
    if (corpus.toLowerCase().includes(phrase)) {
      checks.push(
        check(
          `banned_${phrase.replace(/\s/g, "_")}`,
          "Abartılı ifade",
          false,
          `"${phrase}" ifadesi tespit edildi`,
          "Abartılı ifade yok",
          { warn: true, severity: "warning", details: { phrase } }
        )
      );
    }
  }

  const healthHit = scanText(corpus, HEALTH_CLAIMS);
  if (healthHit || (isSensitive && cat.includes("sağlık"))) {
    checks.push(
      check(
        "health_claim",
        "Sağlık iddiası",
        !healthHit,
        "Kesin sağlık/tedavi iddiası",
        "Sağlık iddiası yok",
        { severity: healthHit ? "blocker" : "info" }
      )
    );
  }

  const financeHit = scanText(corpus, FINANCE_CLAIMS);
  checks.push(
    check(
      "finance_claim",
      "Finans iddiası",
      !financeHit,
      "Kesin finansal getiri iddiası",
      "Finans iddiası yok",
      { severity: financeHit ? "blocker" : "info" }
    )
  );

  const legalHit = scanText(corpus, LEGAL_CLAIMS);
  checks.push(
    check(
      "legal_claim",
      "Hukuk iddiası",
      !legalHit,
      "Kesin hukuki sonuç iddiası",
      "Hukuk iddiası yok",
      { severity: legalHit ? "blocker" : "info" }
    )
  );

  const stockPriceClaims = [/stok garant/i, /fiyat garant/i, /kesin stok/i, /kesin fiyat/i];
  const spHit = scanText(corpus, stockPriceClaims);
  checks.push(
    check(
      "stock_price_claim",
      "Stok/fiyat kesinliği",
      !spHit,
      "Stok/fiyat kesinliği iddiası",
      "Dinamik stok/fiyat uyarısı uygun",
      { warn: !!spHit, severity: spHit ? "warning" : "info" }
    )
  );

  const certWords = ["sertifika", "garanti belgesi", "iso 9001", "ce belgesi"];
  const hasCertWord = certWords.some((w) => corpus.toLowerCase().includes(w));
  const hasCertSource = !!(ctx.blueprintMetadata.brand || ctx.blueprintMetadata.importSource);
  if (hasCertWord) {
    checks.push(
      check(
        "cert_claim",
        "Sertifika/garanti",
        hasCertSource,
        "Sertifika/garanti kelimesi var ama kaynak zayıf",
        "Sertifika iddiası kaynaklı",
        { warn: !hasCertSource, severity: "warning" }
      )
    );
  }

  if (checks.length === 0) {
    checks.push(check("policy_clean", "Policy", true, "", "İçerik policy kontrolünden geçti"));
  }

  return checks;
}

export function policyGatePassed(checks: PublishGateCheck[]): boolean {
  return !checks.some((c) => c.status === "FAIL" && c.severity === "blocker");
}
