import { PartnerAdminShell } from "@/components/partners/PartnerAdminShell";

export default function AdminPodProductionPage() {
  return (
    <PartnerAdminShell
      title="POD Üretim Dosyaları"
      backHref="/admin/pod"
      stubLabel="Yakında"
      description="Production pack arşivi ve bayi üretim dosyası listesi — POD Core V4 pack API sonraki fazda buraya bağlanacak."
    />
  );
}
