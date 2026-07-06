import { prisma } from "@/lib/db";

export type CategoryNavNode = {
  id: string;
  name: string;
  slug: string;
  children: CategoryNavNode[];
};

export async function collectDescendantIds(rootId: string): Promise<string[]> {
  const ids: string[] = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const batch = queue.splice(0, 50);
    const rows = await prisma.category.findMany({
      where: { id: { in: batch } },
      select: { id: true, children: { select: { id: true } } },
    });
    for (const row of rows) {
      ids.push(row.id);
      queue.push(...row.children.map((c) => c.id));
    }
  }
  return ids;
}

export async function collectLeafCategoryNames(rootId: string): Promise<string[]> {
  const ids = await collectDescendantIds(rootId);
  const rows = await prisma.category.findMany({
    where: { id: { in: ids } },
    select: { name: true, children: { select: { id: true } } },
  });
  return rows.filter((r) => r.children.length === 0).map((r) => r.name);
}

export async function buildCategoryNavTree(rootId: string): Promise<CategoryNavNode | null> {
  const root = await prisma.category.findUnique({
    where: { id: rootId },
    include: {
      children: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!root) return null;

  async function mapNode(cat: { id: string; name: string; slug: string }): Promise<CategoryNavNode> {
    const children = await prisma.category.findMany({
      where: { parentId: cat.id, active: true },
      orderBy: { sortOrder: "asc" },
    });
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      children: await Promise.all(children.map(mapNode)),
    };
  }

  return {
    id: root.id,
    name: root.name,
    slug: root.slug,
    children: await Promise.all(root.children.map(mapNode)),
  };
}
