/**
 * Lists Gemini models that support generateContent. Does not print API keys.
 * Usage: GEMINI_API_KEY=... npx tsx scripts/check-gemini-models.ts
 */
const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  console.error("GEMINI_API_KEY not set");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function main() {
  const res = await fetch(url);
  const json = (await res.json()) as {
    models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    console.error("API error:", json.error?.message || res.statusText);
    process.exit(1);
  }

  const flash = (json.models || [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => n.includes("flash"));

  console.log("generateContent + flash models:");
  for (const name of flash) {
    console.log(`  - ${name}`);
  }

  const preferred = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.0-flash-lite"];
  const pick = preferred.find((p) => flash.includes(p)) || flash[0];
  if (pick) {
    console.log(`\nSuggested GEMINI_MODEL=${pick}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
