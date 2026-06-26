import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import path from "path";
import type { ProductEngineOverrides } from "./types";

const ROOT = path.join(process.cwd(), ".data", "product-engine");

type StoredProfile = {
  id: string;
  overrides: ProductEngineOverrides;
  custom?: boolean;
  updatedAt: string;
  createdAt: string;
};

function filePath(id: string): string {
  return path.join(ROOT, `${id}.json`);
}

async function ensureDir(): Promise<void> {
  await mkdir(ROOT, { recursive: true });
}

export async function loadProfileOverrides(id: string): Promise<StoredProfile | null> {
  try {
    const raw = await readFile(filePath(id), "utf-8");
    return JSON.parse(raw) as StoredProfile;
  } catch {
    return null;
  }
}

export async function saveProfileOverrides(
  id: string,
  overrides: ProductEngineOverrides,
  custom = false
): Promise<StoredProfile> {
  await ensureDir();
  const existing = await loadProfileOverrides(id);
  const record: StoredProfile = {
    id,
    overrides: deepMerge(existing?.overrides ?? {}, overrides),
    custom: custom || existing?.custom || false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeFile(filePath(id), JSON.stringify(record, null, 2), "utf-8");
  return record;
}

export async function listCustomProfileIds(): Promise<string[]> {
  try {
    await ensureDir();
    const files = await readdir(ROOT);
    const ids: string[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const raw = await readFile(path.join(ROOT, f), "utf-8");
      const parsed = JSON.parse(raw) as StoredProfile;
      if (parsed.custom) ids.push(parsed.id);
    }
    return ids;
  } catch {
    return [];
  }
}

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof base[k] === "object" && base[k] && !Array.isArray(base[k])) {
      out[k as keyof T] = deepMerge(base[k] as Record<string, unknown>, v as Record<string, unknown>) as T[keyof T];
    } else if (v !== undefined) {
      out[k as keyof T] = v as T[keyof T];
    }
  }
  return out;
}
