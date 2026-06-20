import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type SitePageShellProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
};

export default function SitePageShell({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Ana Sayfa",
  children,
}: SitePageShellProps) {
  return (
    <div className="app-viewport min-h-screen w-full bg-ena-dark">
      <div className="border-b border-white/10 bg-ena-card/30">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Link
            href={backHref}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-ena-light transition-colors hover:text-ena-text"
          >
            <ChevronLeft size={16} />
            {backLabel}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-ena-text md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ena-light">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-10">{children}</div>
    </div>
  );
}

export const siteProseClass =
  "site-prose prose prose-invert max-w-none text-ena-light leading-relaxed prose-headings:text-ena-text prose-headings:font-semibold prose-a:text-ena-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-ena-text prose-li:marker:text-ena-primary/70 break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_img]:max-w-full";

export const sitePolicyProseClass =
  `${siteProseClass} prose-ol:space-y-2 prose-ul:space-y-1 [&_ol>li]:rounded-lg [&_ol>li]:border [&_ol>li]:border-white/10 [&_ol>li]:bg-ena-card/40 [&_ol>li]:px-4 [&_ol>li]:py-3`;
