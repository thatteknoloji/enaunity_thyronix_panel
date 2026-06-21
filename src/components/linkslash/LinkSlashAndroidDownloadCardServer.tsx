import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { getLinkSlashDownloadStatus, isApkDownloadable } from "@/lib/linkslash/download-status";
import { LinkSlashAndroidDownloadCard } from "./LinkSlashAndroidDownloadCard";

export async function LinkSlashAndroidDownloadCardServer({
  variant = "hero",
  className = "",
}: {
  variant?: "hero" | "compact";
  className?: string;
}) {
  const user = await getSession();
  const access = user ? await assertLinkSlashAccess(user) : { allowed: false, code: "AUTH_REQUIRED" as const };
  const status = getLinkSlashDownloadStatus();
  const apkReady = isApkDownloadable(status.android);

  return (
    <LinkSlashAndroidDownloadCard
      hasLicense={access.allowed}
      isAuthenticated={!!user}
      accessCode={access.code}
      apkReady={apkReady}
      apkSize={status.android.size}
      variant={variant}
      className={className}
    />
  );
}
