"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FooterLegalStripItemDTO } from "@/lib/footer-legal-strip";

export function FooterLegalStrip() {
  const [items, setItems] = useState<FooterLegalStripItemDTO[]>([]);

  useEffect(() => {
    fetch("/api/public/footer-legal-strip")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setItems(d.data || []);
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="w-full border-t border-gray-200 bg-[#f3f4f6]">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {items.map((item) => {
            const inner = item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.label || "Hukuki bilgi"}
                className="max-h-8 max-w-[120px] object-contain"
              />
            ) : (
              <span className="text-[11px] sm:text-xs font-medium text-gray-700 whitespace-nowrap">
                {item.label}
              </span>
            );

            const boxClass =
              "inline-flex min-h-[40px] min-w-[72px] items-center justify-center rounded border border-gray-200 bg-white px-3 py-2 shadow-sm";

            if (item.linkUrl) {
              const external = item.linkUrl.startsWith("http");
              if (external) {
                return (
                  <a
                    key={item.id}
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={boxClass}
                  >
                    {inner}
                  </a>
                );
              }
              return (
                <Link key={item.id} href={item.linkUrl} className={boxClass}>
                  {inner}
                </Link>
              );
            }

            return (
              <div key={item.id} className={boxClass}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
