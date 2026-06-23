import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { assertPageFactoryAccess } from "@/lib/page-factory/access";
import { PageFactoryPfIndex } from "@/components/page-factory/PageFactoryPfIndex";

export default async function PfIndexPage() {
  const user = await getSession();
  const access = await assertPageFactoryAccess(user);
  if (!access.allowed) {
    redirect("/login?redirect=/pf-index");
  }

  return <PageFactoryPfIndex mode={user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" ? "admin" : "dealer"} />;
}
