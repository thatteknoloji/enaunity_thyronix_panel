"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ID || typeof window === "undefined") return;
    const url = searchParams.size > 0 ? `${pathname}?${searchParams}` : pathname;
    (window as any).gtag?.("config", GA_ID, { page_path: url });
  }, [pathname, searchParams]);

  return null;
}
