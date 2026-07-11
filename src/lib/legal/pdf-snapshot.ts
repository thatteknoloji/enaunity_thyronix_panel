import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { jsPDF } from "jspdf";
import { createHash } from "crypto";

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatContractVersionLabel(versionNum: number): string {
  return `v${versionNum}.0`;
}

export async function generateContractPdfSnapshot(input: {
  contractSlug: string;
  versionNum: number;
  title: string;
  content: string;
}): Promise<{ pdfUrl: string; pdfHash: string }> {
  const plain = htmlToPlainText(input.content);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(input.title, margin, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Sürüm: ${formatContractVersionLabel(input.versionNum)} · ENA UNITY`, margin, y);
  y += 24;

  const lines = doc.splitTextToSize(plain, pageWidth);
  for (const line of lines) {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 14;
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  const dir = path.join(process.cwd(), "public", "uploads", "legal-pdfs", input.contractSlug);
  await mkdir(dir, { recursive: true });
  const fileName = `${input.contractSlug}-${input.versionNum}.pdf`;
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, buffer);

  const pdfUrl = `/uploads/legal-pdfs/${input.contractSlug}/${fileName}`;
  const pdfHash = createHash("sha256").update(buffer).digest("hex");
  return { pdfUrl, pdfHash };
}
