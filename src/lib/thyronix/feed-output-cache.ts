import fs from "fs/promises";
import path from "path";

const ROOT = path.join(process.cwd(), "storage", "thyronix", "feed-outputs");

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function getFeedXmlCachePath(feedId: string, part: number) {
  return path.join(ROOT, safeSegment(feedId), `part-${String(part).padStart(3, "0")}.xml`);
}

export async function readFeedXmlCache(feedId: string, part: number) {
  const filePath = getFeedXmlCachePath(feedId, part);
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export async function writeFeedXmlCache(feedId: string, part: number, xml: string) {
  const filePath = getFeedXmlCachePath(feedId, part);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, xml, "utf8");
  return filePath;
}

export async function isFeedXmlCacheFresh(feedId: string, part: number, publishedAt?: Date | null) {
  const filePath = getFeedXmlCachePath(feedId, part);
  try {
    const stat = await fs.stat(filePath);
    if (!publishedAt) return true;
    return stat.mtimeMs >= publishedAt.getTime();
  } catch {
    return false;
  }
}
