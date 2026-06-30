import { DigitalLibraryPanel } from "@/components/digital-access/DigitalLibraryPanel";

export default function DealerDigitalLibraryPage() {
  return (
    <DigitalLibraryPanel
      title="Dijital Kütüphane"
      description="Siparişlerinizden açılan dijital dosyaları, lisans anahtarlarını ve erişim kayıtlarını buradan yönetin."
      orderHrefTemplate="/dealer/orders/{id}"
    />
  );
}
