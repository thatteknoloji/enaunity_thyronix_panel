"use client";

type Props = {
  src?: string;
  title?: string;
};

export default function LinkSlashAppShell({ src = "/linkslash/index.html", title = "LinkSlash" }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f1117]">
      <iframe
        title={title}
        src={src}
        className="h-full w-full flex-1 border-0"
        allow="clipboard-write"
      />
    </div>
  );
}
