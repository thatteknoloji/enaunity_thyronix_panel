import { mkdir, readFile, readdir, unlink, writeFile } from "fs/promises";
import path from "path";
import type { PodCoreProjectRecord } from "./pod-types";

const ROOT_DIR = path.join(process.cwd(), ".data", "pod-core-projects");

function userDir(ownerUserId: string): string {
  return path.join(ROOT_DIR, ownerUserId);
}

function projectPath(ownerUserId: string, projectId: string): string {
  return path.join(userDir(ownerUserId), `${projectId}.json`);
}

async function ensureUserDir(ownerUserId: string): Promise<void> {
  await mkdir(userDir(ownerUserId), { recursive: true });
}

export async function savePodCoreProject(record: PodCoreProjectRecord): Promise<PodCoreProjectRecord> {
  await ensureUserDir(record.ownerUserId);
  await writeFile(projectPath(record.ownerUserId, record.projectId), JSON.stringify(record), "utf-8");
  return record;
}

export async function loadPodCoreProject(
  ownerUserId: string,
  projectId: string
): Promise<PodCoreProjectRecord | null> {
  try {
    const raw = await readFile(projectPath(ownerUserId, projectId), "utf-8");
    return JSON.parse(raw) as PodCoreProjectRecord;
  } catch {
    return null;
  }
}

export async function listPodCoreProjects(ownerUserId: string): Promise<PodCoreProjectRecord[]> {
  try {
    const dir = userDir(ownerUserId);
    await mkdir(dir, { recursive: true });
    const files = await readdir(dir);
    const records: PodCoreProjectRecord[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(path.join(dir, file), "utf-8");
        records.push(JSON.parse(raw) as PodCoreProjectRecord);
      } catch {
        /* skip corrupt */
      }
    }
    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function deletePodCoreProject(ownerUserId: string, projectId: string): Promise<boolean> {
  try {
    await unlink(projectPath(ownerUserId, projectId));
    return true;
  } catch {
    return false;
  }
}

export async function duplicatePodCoreProject(
  ownerUserId: string,
  projectId: string,
  newName?: string
): Promise<PodCoreProjectRecord | null> {
  const source = await loadPodCoreProject(ownerUserId, projectId);
  if (!source) return null;
  const now = new Date().toISOString();
  const copy: PodCoreProjectRecord = {
    ...source,
    projectId: `pc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectName: newName?.trim() || `${source.projectName} (Kopya)`,
    createdAt: now,
    updatedAt: now,
  };
  return savePodCoreProject(copy);
}
