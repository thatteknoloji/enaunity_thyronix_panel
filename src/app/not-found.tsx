import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="tr">
      <body className="min-h-screen flex items-center justify-center bg-[#141414] text-white font-sans">
        <div className="text-center space-y-6 px-4">
          <h1 className="text-9xl font-black text-[#e50914]">404</h1>
          <p className="text-xl text-[#b3b3b3]">Aradığınız sayfa bulunamadı.</p>
          <Link
            href="/"
            className="inline-block px-6 py-2.5 bg-[#e50914] text-white font-medium rounded-lg hover:brightness-90 transition-colors"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </body>
    </html>
  );
}
