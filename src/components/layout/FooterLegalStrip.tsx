"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FooterLegalStripItemDTO } from "@/lib/footer-legal-strip";
import { TrustBadgeIcon, type TrustBadgeKey } from "@/lib/footer-trust-badges";

function resolveBadgeKey(item: FooterLegalStripItemDTO): TrustBadgeKey | null {
  const label = item.label.toLowerCase();
  if (label.includes("visa")) return "visa";
  if (label.includes("master")) return "mastercard";
  if (label.includes("troy")) return "troy";
  if (label.includes("amex") || label.includes("american")) return "amex";
  if (label.includes("3d") || label.includes("secure")) return "3dsecure";
  if (label.includes("ssl") || label.includes("256")) return "ssl";
  if (label.includes("pci")) return "pci";
  if (label.includes("iyzico") || label.includes("iyz")) return "iyzico";
  if (label.includes("paytr")) return "paytr";
  return null;
}

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
    <div className="w-full border-t border-ena-border bg-ena-card/40">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
          {items.map((item) => {
            const badgeKey = resolveBadgeKey(item);
            const inner = item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.label || "Güven rozeti"}
                className="max-h-7 max-w-[100px] object-contain opacity-90"
              />
            ) : badgeKey ? (
              <TrustBadgeIcon badge={badgeKey} className="h-7 w-auto" />
            ) : (
              <span className="text-[10px] sm:text-[11px] font-semibold text-ena-text/80 whitespace-nowrap tracking-wide">
                {item.label}
              </span>
            );

            const boxClass =
              "inline-flex min-h-[38px] min-w-[68px] items-center justify-center rounded-md border border-ena-border/80 bg-ena-dark/50 px-3 py-1.5 shadow-sm transition-colors hover:border-ena-border hover:bg-ena-card/60";

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
                    title={item.label}
                  >
                    {inner}
                  </a>
                );
              }
              return (
                <Link key={item.id} href={item.linkUrl} className={boxClass} title={item.label}>
                  {inner}
                </Link>
              );
            }

            return (
              <div key={item.id} className={boxClass} title={item.label}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
