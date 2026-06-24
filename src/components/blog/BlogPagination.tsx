import Link from "next/link";

type Props = {
  current: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string>;
};

export function BlogPagination({ current, totalPages, basePath, searchParams = {} }: Props) {
  if (totalPages <= 1) return null;

  const buildHref = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    const q = params.toString();
    return q ? `${basePath}?${q}` : basePath;
  };

  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Sayfalama">
      {current > 1 ? (
        <Link
          href={buildHref(current - 1)}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-ena-light/70 hover:border-ena-accent/40"
        >
          Önceki
        </Link>
      ) : null}
      <span className="text-sm text-ena-light/50">
        {current} / {totalPages}
      </span>
      {current < totalPages ? (
        <Link
          href={buildHref(current + 1)}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-ena-light/70 hover:border-ena-accent/40"
        >
          Sonraki
        </Link>
      ) : null}
    </nav>
  );
}
