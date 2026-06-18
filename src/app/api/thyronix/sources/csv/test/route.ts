import { NextResponse } from "next/server";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";

type Dict = Record<string, string>;

function detectDelimiter(line: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0, "|": 0 };
  for (const ch of line) { if (ch in counts) counts[ch]++; }
  const max = Math.max(...Object.values(counts));
  if (max === 0) return ",";
  return Object.entries(counts).find(([_, c]) => c === max)?.[0] || ",";
}

function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === ",") return line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  return line.split(delimiter);
}

function clean(val: string): string {
  return val.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
}

function requiredFields(row: Dict, headers: string[]): { missing: string[]; productName: boolean; price: boolean; identity: boolean } {
  const vals = headers.map(h => clean(row[h] || ""));
  const hasName = vals.some(v => v.length > 0);
  const hasPrice = vals.some(v => !isNaN(Number(v.replace(/[^0-9.,-]/g, "").replace(",", "."))) && Number(v.replace(/[^0-9.,-]/g, "").replace(",", ".")) > 0);
  const hasIdentity = vals.some(v => v.length >= 6);
  return { missing: [], productName: hasName, price: hasPrice, identity: hasIdentity };
}

export async function POST(req: Request) {
  try {
    await requireThyronixDealerOrAdmin();
    const body = await req.json();
    const { url, delimiter: inputDelimiter } = body;

    if (!url) return NextResponse.json({ error: "CSV URL gerekli" }, { status: 400 });

    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return NextResponse.json({ error: `Dosya indirilemedi: HTTP ${res.status}` }, { status: 400 });

    const csvText = await res.text();
    if (!csvText.trim()) return NextResponse.json({ error: "CSV boş" }, { status: 400 });

    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return NextResponse.json({ error: "CSV'de yeterli satır yok (en az 2 satır gerekli)" }, { status: 400 });

    const delimiter = inputDelimiter || detectDelimiter(lines[0]);

    const headers = splitLine(lines[0], delimiter).map(clean).filter(h => h.length > 0);
    if (headers.length === 0) return NextResponse.json({ error: "Başlık satırı algılanamadı" }, { status: 400 });

    // Parse preview rows + validation
    const previewRows: Dict[] = [];
    let validRows = 0, invalidRows = 0;
    let missingProductName = 0, missingPrice = 0, missingIdentity = 0;

    for (let i = 1; i < lines.length; i++) {
      const vals = splitLine(lines[i], delimiter).map(clean);
      if (vals.length === 0 || vals.every(v => !v)) continue;

      const row: Dict = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });

      const check = requiredFields(row, headers);
      if (check.productName && check.price && check.identity) validRows++;
      else {
        invalidRows++;
        if (!check.productName) missingProductName++;
        if (!check.price) missingPrice++;
        if (!check.identity) missingIdentity++;
      }

      if (previewRows.length < 20) previewRows.push(row);
    }

    return NextResponse.json({
      success: true,
      data: {
        columns: headers,
        previewRows,
        detectedDelimiter: delimiter,
        totalRows: validRows + invalidRows,
        validation: { validRows, invalidRows, missingProductName, missingPrice, missingIdentity },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "CSV işlenemedi" }, { status: 500 });
  }
}
