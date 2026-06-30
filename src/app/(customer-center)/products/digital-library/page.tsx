import { DigitalLibraryPanel } from "@/components/digital-access/DigitalLibraryPanel";

export default function CustomerDigitalLibraryPage() {
  return (
    <DigitalLibraryPanel
      title="Dijital Erişimlerim"
      description="Aktif dijital teslimatlarınızı, indirme haklarınızı ve lisans bilgilerinizi tek merkezde görün."
      orderHrefTemplate="/account#orders"
    />
  );
}
