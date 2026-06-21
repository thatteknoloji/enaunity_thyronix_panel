import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminSecretPath, isAdminRole } from "@/lib/auth/admin-access";

export default async function ProductLibraryRedirect() {
  const user = await getSession();
  if (user && isAdminRole(user.role)) {
    redirect(`${getAdminSecretPath()}/product-library`);
  }
  redirect("/dealer/product-library");
}
