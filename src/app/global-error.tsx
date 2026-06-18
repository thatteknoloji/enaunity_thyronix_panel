"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ENAUNITY]", error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="min-h-screen flex items-center justify-center bg-[#141414] text-white font-sans">
        <div className="text-center space-y-6 px-4 max-w-md">
          <h1 className="text-4xl font-black text-[#e50914]">Sunucu Hatası</h1>
          <p className="text-[#b3b3b3] text-sm leading-relaxed">
            Dev sunucu bozulmuş olabilir. Terminalde şunu çalıştırın:
          </p>
          <code className="block text-xs bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-left text-emerald-400">
            npm run dev:fix
          </code>
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="px-5 py-2.5 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors text-sm"
            >
              Tekrar Dene
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#e50914] text-white font-medium rounded-lg hover:brightness-90 transition-colors text-sm"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
