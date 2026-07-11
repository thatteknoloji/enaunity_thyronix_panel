import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function ensureUniqueBlogSlug(base: string, excludeId?: string): Promise<string> {
  let slug = slugify(base) || "blog";
  let n = 0;
  while (true) {
    const existing = await prisma.blogPost.findFirst({
      where: {
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return slug;
    n += 1;
    slug = `${slugify(base) || "blog"}-${n}`;
  }
}
