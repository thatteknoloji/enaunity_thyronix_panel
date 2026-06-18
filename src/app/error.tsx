"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="min-h-screen flex items-center justify-center bg-[#141414] text-white font-sans">
        <div className="text-center space-y-6 px-4">
          <h1 className="text-4xl font-black text-[#e50914]">Hata</h1>
          <p className="text-[#b3b3b3]">Bir şeyler ters gitti. Lütfen tekrar deneyin.</p>
          <button
            onClick={reset}
            className="inline-block px-6 py-2.5 bg-[#e50914] text-white font-medium rounded-lg hover:brightness-90 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </body>
    </html>
  );
}
