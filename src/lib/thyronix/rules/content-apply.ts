import type { ThyronixFieldLocks } from "../field-lock";
import { stripBrandFromTitle } from "./resolver";
import type { ThyronixAiRules } from "./types";

export function applyBannedWords(text: string, banned: string[]): string {
  let out = text;
  for (const raw of banned) {
    const word = raw.trim();
    if (!word) continue;
    out = out.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

export function wrapWithAffixes(text: string, prefix: string, suffix: string): string {
  const core = text.trim();
  if (!core) {
    const shell = [prefix, suffix].filter(Boolean).join(" ").trim();
    return shell;
  }
  return [prefix, core, suffix].filter(Boolean).join(" ").trim();
}

/** Şablon kuralları: marka temizleme, prefix/suffix, yasaklı kelime (AI çağrısı yok). */
export function applyContentRulesToRow(
  row: Record<string, unknown>,
  rules: ThyronixAiRules,
  locks: ThyronixFieldLocks = {},
): Record<string, unknown> {
  const out = { ...row };
  const brand = row.brand != null ? String(row.brand) : null;

  if (!locks.name) {
    let name = String(row.name ?? "");
    if (rules.stripBrandFromTitle) {
      name = stripBrandFromTitle(name, brand);
    }
    name = applyBannedWords(name, rules.bannedWords);
    name = wrapWithAffixes(name, rules.titlePrefix, rules.titleSuffix);
    out.name = name;
  }

  if (!locks.description) {
    let description = row.description != null ? String(row.description) : "";
    description = applyBannedWords(description, rules.bannedWords);
    description = wrapWithAffixes(description, rules.descriptionPrefix, rules.descriptionSuffix);
    out.description = description || null;
  }

  return out;
}

export function applyContentRulesBatch(
  rows: Record<string, unknown>[],
  rules: ThyronixAiRules,
): Record<string, unknown>[] {
  return rows.map((row) => applyContentRulesToRow(row, rules));
}
