"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-4xl font-black text-[#e50914]">Hata</h1>
        <p className="text-[#b3b3b3]">Bir şeyler ters gitti. Lütfen tekrar deneyin.</p>
        <button
          onClick={reset}
          className="inline-block rounded-lg bg-[#e50914] px-6 py-2.5 font-medium text-white transition-colors hover:brightness-90"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
