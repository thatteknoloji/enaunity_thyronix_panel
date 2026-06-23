import { PartnerAdminShell } from "@/components/partners/PartnerAdminShell";

export default function AdminAiPartnerPage() {
  return (
    <PartnerAdminShell
      title="AI Partner Merkezi"
      backHref="/admin/partners"
      stubLabel="Yakında"
      description="Bayi AI içerik üretim modülü — yönetim özeti (Faz 0)"
    />
  );
}
