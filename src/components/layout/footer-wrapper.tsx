"use client";

import { usePathname } from "next/navigation";
import Footer from "./footer";
import { FooterLegalStrip } from "./FooterLegalStrip";

export default function FooterWrapper() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return (
      <footer className="border-t border-white/5 bg-[#141414]">
        <div className="mx-auto max-w-7xl px-4 py-3 text-center text-[10px] text-white/20">
          Powered by{" "}
          <a href="https://thatteknoloji.com" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/50 transition-colors">
            ThatTeknoloji®
          </a>
        </div>
      </footer>
    );
  }

  return (
    <>
      <Footer />
      <FooterLegalStrip />
    </>
  );
}
