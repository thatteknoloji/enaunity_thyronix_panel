/**
 * Production site içeriği bootstrap — admin API ile (SSH gerekmez).
 * Kullanım: npx tsx scripts/bootstrap-prod-site-content.ts
 */
import { DEFAULT_CONTRACTS } from "../src/lib/pages/default-content";

const BASE = process.env.PROD_URL || "https://enaunity.com.tr";
const EMAIL = process.env.ADMIN_EMAIL || "admin@enaunity.com";
const PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Login failed: ${JSON.stringify(data)}`);

  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/token=([^;]+)/);
  if (!match) throw new Error("No auth token in response");
  return `token=${match[1]}`;
}

async function main() {
  console.log(`→ Login ${BASE}…`);
  const cookie = await login();
  console.log("✓ Admin oturumu açıldı");

  const publicContracts = DEFAULT_CONTRACTS.filter((c) => c.type !== "dealer");
  for (const c of publicContracts) {
    const res = await fetch(`${BASE}/api/admin/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ title: c.title, slug: c.slug, content: c.content, type: "public" }),
    });
    const data = await res.json();
    if (data.success) {
      console.log(`  ✓ ${c.title} (/contracts/${c.slug})`);
    } else {
      console.log(`  ✗ ${c.slug}: ${data.error || res.status}`);
    }
  }

  const check = await fetch(`${BASE}/api/contracts`);
  const list = await check.json();
  console.log(`\n→ /api/contracts: ${list.data?.length ?? 0} kayıt`);
  if (list.data?.length) {
    for (const c of list.data) console.log(`  - ${c.title}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
