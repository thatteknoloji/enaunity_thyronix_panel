import { createHash } from "crypto";

export function sha256Content(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
