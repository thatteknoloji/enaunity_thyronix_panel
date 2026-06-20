"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";

export type ContractLink = { id: string; slug: string; title: string };

type Props = {
  contracts: ContractLink[];
  title?: string;
  children: React.ReactNode;
};

export default function ContractsShell({ contracts, title, children }: Props) {
  const pathname = usePathname();
  const activeSlug = pathname?.startsWith("/contracts/") ? pathname.split("/")[2] : null;

  return (
    <div className="app-viewport min-h-screen w-full bg-ena-dark">
      <div className="border-b border-white/10 bg-ena-card/30">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-ena-light transition-colors hover:text-ena-text"
          >
            <ChevronLeft size={16} />
            Ana Sayfa
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-ena-text md:text-4xl">
            {title || "Sözleşmeler"}
          </h1>
          <p className="mt-2 text-sm text-ena-light">
            KVKK, gizlilik, mesafeli satış ve diğer yasal metinler.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="w-full shrink-0 lg:w-72 lg:sticky lg:top-24">
            <nav className="rounded-xl border border-white/10 bg-ena-card/30 p-2 max-h-[70vh] overflow-y-auto">
              {contracts.length === 0 ? (
                <p className="p-4 text-sm text-ena-light/60">Sözleşme bulunamadı</p>
              ) : (
                contracts.map((c) => {
                  const active = activeSlug === c.slug || (!activeSlug && contracts[0]?.slug === c.slug);
                  return (
                    <Link
                      key={c.id}
                      href={`/contracts/${c.slug}`}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-ena-primary/15 text-ena-text font-medium border border-ena-primary/25"
                          : "text-ena-light hover:bg-white/5 hover:text-ena-text"
                      }`}
                    >
                      <FileText size={15} className="shrink-0 opacity-70" />
                      <span className="leading-snug">{c.title}</span>
                    </Link>
                  );
                })
              )}
            </nav>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

export const contractProseClass =
  "site-prose prose prose-invert max-w-none text-ena-light leading-relaxed prose-headings:text-ena-text prose-headings:font-semibold prose-a:text-ena-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-ena-text prose-li:marker:text-ena-primary/70 break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_img]:mx-auto [&_img]:my-6 [&_img]:rounded-lg [&_img]:border [&_img]:border-white/10 [&_img]:max-w-full";
