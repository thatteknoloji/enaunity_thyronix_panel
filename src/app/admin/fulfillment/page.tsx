import { redirect } from "next/navigation";
import { toAdminUrl } from "@/lib/auth/admin-access";

export default function AdminFulfillmentRedirect() {
  redirect(toAdminUrl("/admin/orders?tab=operasyon"));
}
