import type { LucideIcon } from "lucide-react";
import {
  Home, User as UserIcon, Shield, ShoppingCart, FileText, Save, Heart,
  Wallet, ReceiptText, CreditCard, MapPin, Upload, RotateCcw, Sparkles, Store, Gift, FileSignature, Palette, Bell,
} from "lucide-react";

export type AccountTab =
  | "overview"
  | "profile"
  | "security"
  | "orders"
  | "quotes"
  | "contracts"
  | "saved-carts"
  | "wishlist"
  | "billing"
  | "addresses"
  | "documents"
  | "returns"
  | "notifications"
  | "integrations"
  | "coupons"
  | "appearance";

export type NavItem =
  | { type: "tab"; key: AccountTab; label: string; icon: LucideIcon }
  | { type: "link"; href: string; label: string; icon: LucideIcon; external?: boolean };

export type NavGroup = { label: string; items: NavItem[] };

export const ACCOUNT_NAV: NavGroup[] = [
  {
    label: "Hesabım",
    items: [
      { type: "tab", key: "overview", label: "Genel Bakış", icon: Home },
      { type: "tab", key: "profile", label: "Profil", icon: UserIcon },
      { type: "tab", key: "security", label: "Güvenlik", icon: Shield },
    ],
  },
  {
    label: "Ticaret",
    items: [
      { type: "tab", key: "orders", label: "Siparişler", icon: ShoppingCart },
      { type: "tab", key: "quotes", label: "Teklifler", icon: FileText },
      { type: "tab", key: "contracts", label: "Sözleşmeler", icon: FileSignature },
      { type: "tab", key: "saved-carts", label: "Kayıtlı Sepetler", icon: Save },
      { type: "tab", key: "wishlist", label: "Favoriler", icon: Heart },
      { type: "tab", key: "coupons", label: "Kampanyalar", icon: Gift },
    ],
  },
  {
    label: "Finans",
    items: [
      { type: "tab", key: "billing", label: "Cari Hesap", icon: Wallet },
      { type: "tab", key: "billing", label: "Faturalar", icon: ReceiptText },
      { type: "tab", key: "billing", label: "Ödemeler", icon: CreditCard },
    ],
  },
  {
    label: "Operasyon",
    items: [
      { type: "tab", key: "addresses", label: "Adresler", icon: MapPin },
      { type: "tab", key: "documents", label: "Evraklar", icon: Upload },
      { type: "tab", key: "returns", label: "İadeler", icon: RotateCcw },
    ],
  },
  {
    label: "Premium Modüller",
    items: [
      { type: "link", href: "/dealer/modules", label: "Modül Pazarı", icon: Sparkles },
      { type: "link", href: "/products", label: "Modül Merkezi", icon: Store },
      { type: "link", href: "/product-library", label: "Hazır Ürünler", icon: Store },
    ],
  },
  {
    label: "Sistem",
    items: [
      { type: "tab", key: "notifications", label: "Bildirimler", icon: Bell },
      { type: "tab", key: "integrations", label: "Entegrasyonlar", icon: Store },
      { type: "link", href: "/account/appearance", label: "Görünüm", icon: Palette },
    ],
  },
];

export const ORDER_STATUS_MAP: Record<string, string> = {
  pending: "Hazırlanıyor",
  pending_approval: "Onay Bekliyor",
  approved: "Onaylandı",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  cancelled: "İptal Edildi",
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  tax_levy: "Vergi Levhası",
  signature_circular: "İmza Sirküleri",
  trade_registry: "Ticaret Sicil Gazetesi",
  other: "Diğer",
};
