import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { getLinkSlashDownloadStatus } from "@/lib/linkslash/download-status";
import { LinkSlashExtensionDownloadCard } from "./LinkSlashExtensionDownloadCard";

export async function LinkSlashExtensionDownloadCardServer({ className = "" }: { className?: string }) {
  const user = await getSession();
  const access = user ? await assertLinkSlashAccess(user) : { allowed: false, code: "AUTH_REQUIRED" as const };
  const status = getLinkSlashDownloadStatus();
  const extReady = status.extension.available;

  return (
    <LinkSlashExtensionDownloadCard
      hasLicense={access.allowed}
      isAuthenticated={!!user}
      accessCode={access.code}
      extensionReady={extReady}
      extensionSize={status.extension.size}
      className={className}
    />
  );
}
