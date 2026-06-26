import { PodAdminShell } from "@/components/pod/PodAdminShell";

const PIPELINE = [
  { step: "Yeni", desc: "Tasarım stüdyosunda oluşturulan POD projesi" },
  { step: "Üretim Dosyası", desc: "Production pack / baskı dosyası hazırlığı" },
  { step: "Baskı", desc: "Üretim partnerine aktarım" },
  { step: "Kargo", desc: "Sevkiyat ve teslimat takibi" },
];

export default function AdminPodOrdersPage() {
  return (
    <PodAdminShell
      title="POD Siparişler"
      description="POD sipariş altyapısı sonraki fazda tamamlanacak — şimdilik süreç önizlemesi"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PIPELINE.map((item, index) => (
          <div key={item.step} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                {index + 1}
              </span>
              <p className="font-semibold text-gray-900">{item.step}</p>
            </div>
            <p className="text-xs text-gray-500">{item.desc}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-6">
        PODOrder API, komisyon ve bayi sipariş akışı bir sonraki fazda bu ekrana bağlanacak.
      </p>
    </PodAdminShell>
  );
}
