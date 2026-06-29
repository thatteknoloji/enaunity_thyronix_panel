import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  ClipboardList,
  Store,
  DollarSign,
  Eye,
  Banknote,
  RotateCcw,
  Warehouse,
  FileText,
  Tag,
  Layers,
  Building2,
  Percent,
  Key,
  MessageSquare,
  ScrollText,
  Layout,
  PackagePlus,
  Truck,
  Shield,
  BarChart3,
  ClipboardCheck,
  Barcode,
  Bell,
  Megaphone,
  Webhook,
  Clock,
  CalendarClock,
  Upload,
  Link2,
  Plug,
  Zap,
  Sparkles,
  CreditCard,
  Globe,
  Handshake,
  Brain,
  Shirt,
  ShoppingBag,
  Map,
  Radio,
  Workflow,
  BookOpen,
  Factory,
  Activity,
  Database,
  Image,
  LineChart,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

export type AdminNavGroup = {
  label: string;
  icon: LucideIcon;
  items: AdminNavItem[];
};

export function navItemPath(href: string): string {
  return href.split("?")[0].split("#")[0];
}

function navPathMatches(pathname: string, path: string): boolean {
  if (pathname === path) return true;
  if (path === "/admin" || path.endsWith("/admin")) return false;
  return pathname.startsWith(`${path}/`);
}

export function resolveActiveNavItemHref(
  pathname: string,
  items: { href: string }[],
  toUrl: (path: string) => string,
): string | null {
  let best: string | null = null;
  let bestLen = -1;
  for (const item of items) {
    const url = toUrl(navItemPath(item.href));
    if (navPathMatches(pathname, url) && url.length > bestLen) {
      best = item.href;
      bestLen = url.length;
    }
  }
  return best;
}

export function buildAdminNavGroups(t: (key: string) => string, legacyMarketplaceEnabled: boolean): AdminNavGroup[] {
  return [
    {
      label: "Genel Bakış",
      icon: LayoutDashboard,
      items: [
        { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard },
        { href: "/admin/reports", label: t("admin.reports"), icon: BarChart3 },
        { href: "/admin/analiz-merkezi", label: "Analiz Merkezi", icon: LineChart },
      ],
    },
    {
      label: "İçerik Merkezi",
      icon: BookOpen,
      items: [
        { href: "/admin/icerik-planlama-merkezi", label: "İçerik Planlama Merkezi", icon: Map },
        { href: "/admin/blog-engine", label: "Blog Merkezi", icon: FileText },
        { href: "/admin/geo-icerik-fabrikasi", label: "GEO İçerik Fabrikası", icon: Globe },
        { href: "/admin/page-factory", label: "Sayfa Merkezi", icon: Factory },
        { href: "/admin/page-factory/data", label: "Veri Evreni", icon: Database },
        { href: "/admin/icerik-kalite-merkezi", label: "İçerik Kalite Merkezi", icon: Shield },
        { href: "/admin/yayin-merkezi", label: "Yayın Merkezi", icon: Radio },
      ],
    },
    {
      label: "Kurtarma Merkezi",
      icon: Link2,
      items: [{ href: "/admin/link-kurtarma-merkezi", label: "Link Kurtarma Merkezi", icon: Link2 }],
    },
    {
      label: "Katalog Merkezi",
      icon: Package,
      items: [
        { href: "/admin/product-universe", label: "Ürün Evreni", icon: Layers },
        { href: "/admin/products", label: "Canlı Ürünler", icon: Package },
        { href: "/admin/products/new", label: "Yeni Ürün Ekle", icon: PackagePlus },
        { href: "/admin/products/import", label: "Toplu Ürün Yükle", icon: Upload },
        { href: "/admin/product-library", label: "Hazır Ürün Deposu", icon: PackagePlus },
        { href: "/admin/fiyat-hesaplama-merkezi", label: "Fiyat Hesaplama Merkezi", icon: DollarSign },
        { href: "/admin/categories", label: "Kategori Yönetimi", icon: Layers },
        { href: "/admin/reviews", label: "Ürün Yorumları", icon: MessageSquare },
      ],
    },
    {
      label: "Operasyon Merkezi",
      icon: Workflow,
      items: [
        { href: "/admin/icerik-operasyon-merkezi", label: "İçerik Operasyon Merkezi", icon: Workflow },
        { href: "/admin/gorev-merkezi", label: "Görev Merkezi", icon: Activity },
        { href: "/admin/yayin-merkezi?tab=queue", label: "Yayın Kuyruğu", icon: Layers },
        { href: "/admin/icerik-operasyon-merkezi?tab=overview", label: "Sistem Durumu", icon: Activity },
      ],
    },
    {
      label: "Site Yönetimi",
      icon: Layout,
      items: [
        { href: "/admin/pages", label: "Manuel Sayfalar", icon: FileText },
        { href: "/admin/site-settings", label: "Site Ayarları", icon: Globe },
        { href: "/admin/footer-settings", label: "Footer Ayarları", icon: Layout },
        { href: "/admin/footer-legal-strip", label: "Footer Hukuki Şerit", icon: Shield },
        { href: "/admin/homepage", label: "Ana Sayfa", icon: LayoutDashboard },
        { href: "/admin/ecosystem", label: "Ekosistem Vitrini", icon: Sparkles },
        { href: "/admin/contracts", label: t("admin.contracts"), icon: ScrollText },
        { href: "/admin/legal-audit", label: "Hukuki Denetim", icon: Shield },
      ],
    },
    {
      label: "Fiyat ve Paketler",
      icon: DollarSign,
      items: [
        { href: "/admin/price-lists", label: t("admin.price_lists"), icon: DollarSign },
        { href: "/admin/tiered-prices", label: t("admin.tiered_prices"), icon: Layers },
        { href: "/admin/dealer-prices", label: t("admin.dealer_prices"), icon: Percent },
        { href: "/admin/catalog-restrictions", label: t("admin.catalog_restrictions"), icon: Eye },
        { href: "/admin/bundles", label: t("admin.bundles"), icon: PackagePlus },
      ],
    },
    {
      label: t("admin.dealer_management"),
      icon: Store,
      items: [
        { href: "/admin/dealers", label: t("admin.dealers"), icon: Store },
        { href: "/admin/members", label: "Üyeler", icon: Users },
        { href: "/admin/dealer-approvals", label: "Bayi Onayları", icon: ClipboardCheck },
        { href: "/admin/dealer-groups", label: t("admin.dealer_groups"), icon: Building2 },
        { href: "/admin/sales-rep", label: t("admin.sales_rep"), icon: Users },
        { href: "/admin/dealer-assignments", label: t("admin.assignment"), icon: Building2 },
        { href: "/admin/partner-applications", label: "Bayi Başvuruları", icon: ClipboardList },
        { href: "/admin/api-keys", label: t("admin.api_keys"), icon: Key },
        { href: "/admin/dealer-documents", label: "Bayi Evrakları", icon: Upload },
      ],
    },
    {
      label: t("admin.orders_finance"),
      icon: ShoppingCart,
      items: [
        { href: "/admin/production", label: "Production Center", icon: Factory },
        { href: "/admin/orders", label: t("admin.orders"), icon: ShoppingCart },
        { href: "/admin/backorders", label: t("admin.backorders"), icon: Clock },
        { href: "/admin/quotes", label: t("admin.quotes"), icon: FileText },
        { href: "/admin/coupons", label: t("admin.coupons"), icon: Tag },
        { href: "/admin/campaigns", label: t("admin.campaigns"), icon: Tag },
        { href: "/admin/returns", label: t("admin.returns"), icon: RotateCcw },
        { href: "/admin/payments", label: t("admin.payments"), icon: Banknote },
        { href: "/admin/payments/gateways", label: "Ödeme Altyapısı", icon: CreditCard },
        { href: "/admin/dealer-balance-topups", label: "Bakiye Yükleme Onayları", icon: Banknote },
        { href: "/admin/payments/policies", label: "Ödeme Politikaları", icon: CreditCard },
        { href: "/admin/payment-terms", label: t("admin.payment_terms"), icon: CalendarClock },
        { href: "/admin/dealer-transactions", label: "Bakiye Hareketleri", icon: DollarSign },
        { href: "/admin/invoices", label: "Faturalar", icon: FileText },
      ],
    },
    {
      label: t("admin.stock_warehouse"),
      icon: Warehouse,
      items: [
        { href: "/admin/stock-movements", label: t("admin.stock_movements"), icon: RotateCcw },
        { href: "/admin/stock-counts", label: t("admin.stock_counts"), icon: ClipboardCheck },
        { href: "/admin/stock/scan", label: t("admin.stock_scan"), icon: Barcode },
        { href: "/admin/warehouses", label: t("admin.warehouses"), icon: Warehouse },
        { href: "/admin/shipping", label: t("admin.shipping"), icon: Truck },
      ],
    },
    {
      label: "POD Merkezi",
      icon: Shirt,
      items: [
        { href: "/admin/pod", label: "POD Genel Bakış", icon: LayoutDashboard },
        { href: "/admin/pod-tasarim-studyo", label: "POD Tasarım Stüdyosu", icon: Sparkles },
        { href: "/admin/pod/templates", label: "POD Şablonları", icon: Layers },
        { href: "/admin/pod/designs", label: "POD Tasarımlar", icon: Image },
        { href: "/admin/pod/orders", label: "POD Siparişler", icon: ShoppingCart },
        { href: "/admin/pod/production", label: "POD Üretim Dosyaları", icon: FileText },
        { href: "/admin/pod/licenses", label: "POD Lisansları", icon: Key },
      ],
    },
    {
      label: "Partner Ecosystem",
      icon: Handshake,
      items: [
        { href: "/admin/partners", label: "Partnerler", icon: Handshake },
        { href: "/admin/partners/applications", label: "Partner Program Başvuruları", icon: ClipboardList },
        { href: "/admin/partners/network", label: "Referans Ağı", icon: Users },
        { href: "/admin/partners/commissions", label: "Komisyonlar", icon: DollarSign },
        { href: "/admin/partners/payouts", label: "Ödemeler", icon: Banknote },
        { href: "/admin/ai-partner", label: "AI Partner", icon: Brain, badge: "Yakında" },
      ],
    },
    {
      label: "Premium Modüller",
      icon: Sparkles,
      items: [
        { href: "/admin/marketplace-hub", label: "Pazaryeri Merkezi", icon: Store },
        { href: "/admin/thyronix", label: "THYRONIX", icon: Zap },
        { href: "/admin/hive", label: "HIVE", icon: Sparkles },
        { href: "/admin/linkslash", label: "LinkSlash Merkezi", icon: Link2 },
        { href: "/admin/product-links", label: "Ürün Bağlantıları", icon: Link2 },
        { href: "/admin/module-licenses", label: "Modül Lisansları", icon: Key },
        { href: "/admin/module-plans", label: "Modül Planları", icon: Layers },
        { href: "/admin/payments/module-payments", label: "Modül Ödemeleri", icon: CreditCard },
        { href: "/admin/integrations/thyronix", label: "THYRONIX Entegrasyon", icon: Plug },
        { href: "/admin/integrations/hive", label: "HIVE Entegrasyon", icon: Plug },
        { href: "/admin/customer-products", label: "Müşteri Ürünleri", icon: Package },
        { href: "/admin/dropship", label: "ENA Dropship", icon: ShoppingBag },
        ...(legacyMarketplaceEnabled
          ? [{ href: "/admin/marketplace", label: "Pazar Yeri (Legacy)", icon: Store }]
          : []),
      ],
    },
    {
      label: "Sistem & Kullanıcılar",
      icon: Shield,
      items: [
        { href: "/admin/users", label: t("admin.users"), icon: Users },
        { href: "/admin/roles", label: t("admin.roles"), icon: Shield },
        { href: "/admin/broadcasts", label: "Bildirim Yayınları", icon: Megaphone },
        { href: "/admin/notifications", label: t("admin.notifications"), icon: Bell },
        { href: "/admin/admin-logs", label: "Admin Logları", icon: ClipboardList },
        { href: "/admin/approval-rules", label: t("admin.approval_rules"), icon: ClipboardCheck },
        { href: "/admin/webhooks", label: t("admin.webhooks"), icon: Webhook },
      ],
    },
  ];
}
