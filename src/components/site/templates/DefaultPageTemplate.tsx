import { siteProseClass } from "../SitePageShell";

export default function DefaultPageTemplate({ content }: { content: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-ena-card/30 p-6 md:p-8 ${siteProseClass}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
