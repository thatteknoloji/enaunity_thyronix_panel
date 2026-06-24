import Link from "next/link";

export default function StoreNotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-ena-dark to-black">
      <div className="text-center space-y-4 max-w-md px-6">
        <div className="text-6xl font-bold text-orange-500">404</div>
        <h1 className="text-2xl font-bold text-white">Mağaza Bulunamadı</h1>
        <p className="text-ena-light">Aradığın mağaza mevcut değil veya yayında değil.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all text-sm">
          ENAUNITY Ana Sayfa
        </Link>
      </div>
    </div>
  );
}
