import { redirect } from "next/navigation";
import { isLegacyMarketplaceEnabled } from "@/lib/marketplace-hub/config";
import LegacyMarketplacePage from "./legacy-client";

export default function AdminMarketplacePage() {
  if (!isLegacyMarketplaceEnabled()) {
    redirect("/admin/marketplace-hub");
  }
  return <LegacyMarketplacePage />;
}
