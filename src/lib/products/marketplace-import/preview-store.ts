import { mkdir, readFile, writeFile, unlink } from "fs/promises";
import path from "path";
import type { GroupedProduct, ImportPresetId } from "./types";

const PREVIEW_DIR = path.join(process.cwd(), ".data", "import-previews");

export interface StoredPreview {
  jobId: string;
  fileName: string;
  preset: ImportPresetId;
  groups: GroupedProduct[];
  totalRows: number;
  createdAt: string;
}

async function ensureDir() {
  await mkdir(PREVIEW_DIR, { recursive: true });
}

function previewPath(jobId: string) {
  return path.join(PREVIEW_DIR, `${jobId}.json`);
}

export async function savePreview(data: Omit<StoredPreview, "createdAt">): Promise<string> {
  await ensureDir();
  const payload: StoredPreview = { ...data, createdAt: new Date().toISOString() };
  await writeFile(previewPath(data.jobId), JSON.stringify(payload), "utf-8");
  return data.jobId;
}

export async function loadPreview(jobId: string): Promise<StoredPreview | null> {
  try {
    const raw = await readFile(previewPath(jobId), "utf-8");
    return JSON.parse(raw) as StoredPreview;
  } catch {
    return null;
  }
}

export async function deletePreview(jobId: string): Promise<void> {
  try {
    await unlink(previewPath(jobId));
  } catch { /* ignore */ }
}
