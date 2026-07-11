"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { siteProseClass } from "../SitePageShell";
import type { FaqItem } from "@/lib/pages/faq-parser";

type FaqPageTemplateProps = {
  introHtml: string;
  items: FaqItem[];
};

export default function FaqPageTemplate({ introHtml, items }: FaqPageTemplateProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-6">
      {introHtml ? (
        <div className={`rounded-xl border border-white/10 bg-ena-card/30 p-6 md:p-8 ${siteProseClass}`}
          dangerouslySetInnerHTML={{ __html: introHtml }}
        />
      ) : null}

      <div className="space-y-2">
        {items.map((item, index) => {
          const open = openIndex === index;
          return (
            <div key={index} className="overflow-hidden rounded-xl border border-white/10 bg-ena-card/30">
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/5"
              >
                <span className="font-medium text-ena-text">{item.question}</span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-ena-light transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open ? (
                <div
                  className={`border-t border-white/10 px-5 pb-5 pt-2 ${siteProseClass} text-sm`}
                  dangerouslySetInnerHTML={{ __html: item.answerHtml }}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-ena-light">
          Henüz soru eklenmemiş. Admin panelinden H3 başlıkları ile soru-cevap ekleyebilirsiniz.
        </p>
      ) : null}
    </div>
  );
}
