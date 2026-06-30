"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRightLeft,
  Barcode,
  CheckCircle2,
  Download,
  Hash,
  KeyRound,
  Layers,
  Link2,
  Lock,
  Package,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductsTabs } from "@/components/admin/ProductsTabs";
import { ProductImagesField } from "@/components/admin/ProductImagesField";
import {
  ProductMerchandisingPanel,
  defaultMerchandisingState,
  type ProductMerchandisingState,
} from "@/components/admin/ProductMerchandisingPanel";
import {
  ProductPresentationPanel,
  defaultPresentationState,
  presentationFromProduct,
  presentationToPayload,
  type ProductPresentationState,
} from "@/components/admin/ProductPresentationPanel";
import { toAdminUrl } from "@/lib/auth/admin-access";
import {
  DIGITAL_DELIVERY_MODES,
  PRODUCT_TYPES,
  digitalModeLabel,
} from "@/lib/products/digital-delivery";

type Mode = "create" | "edit";

interface CategoryRow {
  id: string;
  name: string;
  parentId?: string | null;
  active?: boolean;
}

interface VariantGroup {
  name: string;
  options: string[];
}

interface VariantCombo {
  sku: string;
  barcode: string;
  price: string;
  stock: string;
  options: string;
}

interface DuplicateConflict {
  scope: "product" | "variant";
  field: "sku" | "barcode" | "modelCode";
  value: string;
  sourceProductId: string;
  sourceProductName: string;
  sourceVariantId?: string;
  label: string;
}

function genSKU(category: string, name: string) {
  return `${category.replace(/\s/g, "").slice(0, 3)}-${name.replace(/\s/g, "").slice(0, 3)}-${Date.now().toString(36).slice(-4)}`.toUpperCase();
}

function genBarcode() {
  return `2${Date.now().toString().slice(-11)}`;
}

function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  const result: T[][] = [];
  const rest = cartesianProduct(arrays.slice(1));
  for (const item of arrays[0]) {
    for (const right of rest) {
      result.push([item, ...right]);
    }
  }
  return result;
}

function parseOptions(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .map((item) => {
            const source = (item ?? {}) as Record<string, unknown>;
            return {
              group: String(source.group || "").trim(),
              value: String(source.value || "").trim(),
            };
          })
          .filter((item) => item.group && item.value)
      : [];
  } catch {
    return [];
  }
}

function optionsKey(value: string) {
  const options = parseOptions(value).sort((a, b) => {
    if (a.group === b.group) return a.value.localeCompare(b.value, "tr");
    return a.group.localeCompare(b.group, "tr");
  });
  return JSON.stringify(options);
}

function buildVariantSku(base: string, options: { group: string; value: string }[]) {
  const prefix = base.trim() || "VAR";
  return `${prefix}-${options.map((item) => item.value).join("-")}`
    .replace(/\s+/g, "")
    .toUpperCase();
}

function buildVariantsFromGroups(groups: VariantGroup[], currentVariants: VariantCombo[], baseSku: string, basePrice: string) {
  const usableGroups = groups.filter((group) => group.name.trim() && group.options.length > 0);
  if (usableGroups.length === 0) return [];

  const combinations = cartesianProduct(
    usableGroups.map((group) =>
      group.options.map((option) => ({
        group: group.name,
        value: option,
      })),
    ),
  );

  const existingMap = new Map(currentVariants.map((variant) => [optionsKey(variant.options), variant]));

  return combinations.map((combination, index) => {
    const options = JSON.stringify(combination);
    const existing = existingMap.get(optionsKey(options));
    if (existing) {
      return {
        ...existing,
        options,
      };
    }

    return {
      sku: buildVariantSku(baseSku, combination),
      barcode: `${genBarcode()}${String(index).padStart(2, "0")}`.slice(0, 13),
      price: basePrice || "0",
      stock: "0",
      options,
    };
  });
}

export function ProductFormScreen({
  mode,
  productId,
}: {
  mode: Mode;
  productId?: string;
}) {
  const isEdit = mode === "edit";
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    description: "",
    productType: "physical",
    price: "",
    image: "",
    category: "",
    subcategory: "",
    brand: "",
    modelCode: "",
    sku: "",
    barcode: "",
    weight: "",
    dimensions: "",
    tags: "",
    stock: "",
    minStockLevel: "",
    maxStockLevel: "",
    backorderable: false,
    eta: "",
    vatRate: "20",
    vatIncluded: true,
    digitalDeliveryMode: "",
    digitalAssetUrl: "",
    digitalAssetName: "",
    digitalAccessInstructions: "",
    digitalDownloadLimit: "0",
    digitalLicenseTemplate: "",
    digitalLicensePoolBulk: "",
    digitalRequiresApproval: false,
  });
  const [imagesJson, setImagesJson] = useState("[]");
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([]);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [variants, setVariants] = useState<VariantCombo[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newOptionInputs, setNewOptionInputs] = useState<Record<number, string>>({});
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicateConflicts, setDuplicateConflicts] = useState<DuplicateConflict[]>([]);
  const [duplicateCheckReady, setDuplicateCheckReady] = useState(false);
  const [merchandising, setMerchandising] = useState<ProductMerchandisingState>(defaultMerchandisingState());
  const [presentation, setPresentation] = useState<ProductPresentationState>(defaultPresentationState());

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((response) => response.json())
      .then((data) => setCategories(Array.isArray(data.data) ? data.data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!isEdit || !productId) return;

    Promise.all([
      fetch(`/api/admin/products/${productId}`).then((response) => response.json()),
      fetch(`/api/admin/variants?productId=${productId}`).then((response) => response.json()),
      fetch(`/api/admin/campaigns`).then((response) => response.json()).catch(() => ({ data: [] })),
    ])
      .then(([productRes, variantRes, campaignRes]) => {
        if (!productRes.success) {
          setLoadError(productRes.error || "Ürün bulunamadı.");
          return;
        }

        const product = productRes.data || {};
        setForm({
          name: product.name || "",
          description: product.description || "",
          productType: product.productType || "physical",
          price: String(product.price || ""),
          image: product.image || "",
          category: product.category || "",
          subcategory: product.subcategory || "",
          brand: product.brand || "",
          modelCode: product.modelCode || "",
          sku: product.sku || "",
          barcode: product.barcode || "",
          weight: String(product.weight || ""),
          dimensions: product.dimensions || "",
          tags: product.tags || "",
          stock: String(product.stock || ""),
          minStockLevel: String(product.minStockLevel || ""),
          maxStockLevel: String(product.maxStockLevel || ""),
          backorderable: Boolean(product.backorderable),
          eta: product.eta || "",
          vatRate: String(product.vatRate ?? 20),
          vatIncluded: product.vatIncluded ?? true,
          digitalDeliveryMode: product.digitalDeliveryMode || "",
          digitalAssetUrl: product.digitalAssetUrl || "",
          digitalAssetName: product.digitalAssetName || "",
          digitalAccessInstructions: product.digitalAccessInstructions || "",
          digitalDownloadLimit: String(product.digitalDownloadLimit ?? 0),
          digitalLicenseTemplate: product.digitalLicenseTemplate || "",
          digitalLicensePoolBulk: product.digitalLicensePoolBulk || "",
          digitalRequiresApproval: Boolean(product.digitalRequiresApproval),
        });
        setImagesJson(product.images || "[]");
        try {
          const parsedSpecs = JSON.parse(product.specs || "[]");
          setSpecs(Array.isArray(parsedSpecs) ? parsedSpecs : []);
        } catch {
          setSpecs([]);
        }

        const assignedCampaignIds = (campaignRes.data || [])
          .filter((campaign: { products?: Array<{ productId: string }> }) =>
            campaign.products?.some((link) => link.productId === productId),
          )
          .map((campaign: { id: string }) => campaign.id);

        setMerchandising({
          variantDisplayMode: product.variantDisplayMode || "buttons",
          salePrice: product.salePrice > 0 ? String(product.salePrice) : "",
          discountLabel: product.discountLabel || "",
          campaignIds: assignedCampaignIds,
        });
        setPresentation(presentationFromProduct(product));

        if (variantRes.success) {
          setVariantGroups(
            (variantRes.data.groups || []).map((group: { name: string; options: Array<{ value: string }> }) => ({
              name: group.name,
              options: group.options.map((option) => option.value),
            })),
          );
          setVariants(
            (variantRes.data.combinations || []).map((variant: { sku: string; barcode: string; price: number; stock: number; options: string }) => ({
              sku: variant.sku,
              barcode: variant.barcode,
              price: String(variant.price ?? 0),
              stock: String(variant.stock ?? 0),
              options: variant.options,
            })),
          );
        }
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "Veri yüklenemedi.");
      })
      .finally(() => setLoading(false));
  }, [isEdit, productId]);

  const topCategories = useMemo(
    () => categories.filter((category) => !category.parentId && category.active !== false),
    [categories],
  );
  const selectedTopCategory = useMemo(
    () => topCategories.find((category) => category.name === form.category) || null,
    [form.category, topCategories],
  );
  const childCategories = useMemo(
    () =>
      selectedTopCategory
        ? categories.filter((category) => category.parentId === selectedTopCategory.id && category.active !== false)
        : [],
    [categories, selectedTopCategory],
  );

  useEffect(() => {
    if (!selectedTopCategory || childCategories.length === 0) return;
    if (form.subcategory && !childCategories.some((category) => category.name === form.subcategory)) {
      setForm((current) => ({ ...current, subcategory: "" }));
    }
  }, [childCategories, form.subcategory, selectedTopCategory]);

  const duplicateProbe = useMemo(
    () => ({
      productId,
      sku: form.sku,
      barcode: form.barcode,
      modelCode: form.modelCode,
      variants: variants.map((variant) => ({
        sku: variant.sku,
        barcode: variant.barcode,
      })),
    }),
    [form.barcode, form.modelCode, form.sku, productId, variants],
  );

  useEffect(() => {
    const hasValues =
      Boolean(duplicateProbe.sku.trim()) ||
      Boolean(duplicateProbe.barcode.trim()) ||
      Boolean(duplicateProbe.modelCode.trim()) ||
      duplicateProbe.variants.some((variant) => variant.sku?.trim() || variant.barcode?.trim());

    if (!hasValues) {
      setDuplicateConflicts([]);
      setDuplicateLoading(false);
      setDuplicateCheckReady(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setDuplicateLoading(true);
      try {
        const response = await fetch("/api/admin/products/duplicate-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(duplicateProbe),
          signal: controller.signal,
        });
        const data = await response.json();
        if (data.success) {
          setDuplicateConflicts(Array.isArray(data.data?.conflicts) ? data.data.conflicts : []);
          setDuplicateCheckReady(true);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setDuplicateCheckReady(false);
        }
      } finally {
        setDuplicateLoading(false);
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [duplicateProbe]);

  const updateForm = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name) {
      toast.error("Grup adı gir.");
      return;
    }
    if (variantGroups.some((group) => group.name.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"))) {
      toast.error("Bu grup zaten var.");
      return;
    }
    setVariantGroups((current) => [...current, { name, options: [] }]);
    setNewGroupName("");
  };

  const addOption = (groupIndex: number) => {
    const value = (newOptionInputs[groupIndex] || "").trim();
    if (!value) return;

    const nextGroups = variantGroups.map((group, index) => {
      if (index !== groupIndex) return group;
      if (group.options.includes(value)) return group;
      return { ...group, options: [...group.options, value] };
    });

    setVariantGroups(nextGroups);
    setVariants((current) => buildVariantsFromGroups(nextGroups, current, form.modelCode || form.sku || form.name, form.price));
    setNewOptionInputs((current) => ({ ...current, [groupIndex]: "" }));
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const nextGroups = variantGroups.map((group, index) => {
      if (index !== groupIndex) return group;
      return {
        ...group,
        options: group.options.filter((_, currentIndex) => currentIndex !== optionIndex),
      };
    });
    setVariantGroups(nextGroups);
    setVariants((current) => buildVariantsFromGroups(nextGroups, current, form.modelCode || form.sku || form.name, form.price));
  };

  const removeGroup = (groupIndex: number) => {
    const nextGroups = variantGroups.filter((_, index) => index !== groupIndex);
    setVariantGroups(nextGroups);
    setVariants((current) => buildVariantsFromGroups(nextGroups, current, form.modelCode || form.sku || form.name, form.price));
  };

  const regenerateVariants = () => {
    const nextVariants = buildVariantsFromGroups(
      variantGroups,
      variants,
      form.modelCode || form.sku || form.name,
      form.price,
    );
    setVariants(nextVariants);
    toast.success(`${nextVariants.length} varyant hazırlandı.`);
  };

  const addSpec = () => setSpecs((current) => [...current, { key: "", value: "" }]);
  const removeSpec = (index: number) => setSpecs((current) => current.filter((_, currentIndex) => currentIndex !== index));

  const loadCamTabloEbat = (options: string[]) => {
    const existingIndex = variantGroups.findIndex((group) => /ebat|boyut|ölçü/i.test(group.name));
    if (existingIndex >= 0) {
      const nextGroups = [...variantGroups];
      nextGroups[existingIndex] = { ...nextGroups[existingIndex], options };
      setVariantGroups(nextGroups);
      setVariants((current) => buildVariantsFromGroups(nextGroups, current, form.modelCode || form.sku || form.name, form.price));
      return;
    }

    const nextGroups = [...variantGroups, { name: "Ebat", options }];
    setVariantGroups(nextGroups);
    setVariants((current) => buildVariantsFromGroups(nextGroups, current, form.modelCode || form.sku || form.name, form.price));
  };

  const submitDisabled = submitting || duplicateLoading || duplicateConflicts.length > 0;
  const inputClassName =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none";
  const isDigitalProduct = form.productType === "digital";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (duplicateConflicts.length > 0) {
      toast.error("Önce duplicate uyarılarını temizle.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(isEdit ? `/api/admin/products/${productId}` : "/api/admin/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price) || 0,
          stock: parseInt(form.stock || "0", 10) || 0,
          weight: parseFloat(form.weight) || 0,
          minStockLevel: parseInt(form.minStockLevel || "0", 10) || 0,
          maxStockLevel: parseInt(form.maxStockLevel || "0", 10) || 0,
          backorderable: form.backorderable,
          eta: form.eta,
          vatRate: parseFloat(form.vatRate) || 20,
          vatIncluded: form.vatIncluded,
          productType: form.productType,
          digitalDeliveryMode: form.digitalDeliveryMode,
          digitalAssetUrl: form.digitalAssetUrl,
          digitalAssetName: form.digitalAssetName,
          digitalAccessInstructions: form.digitalAccessInstructions,
          digitalDownloadLimit: parseInt(form.digitalDownloadLimit || "0", 10) || 0,
          digitalLicenseTemplate: form.digitalLicenseTemplate,
          digitalLicensePoolBulk: form.digitalLicensePoolBulk,
          digitalRequiresApproval: form.digitalRequiresApproval,
          specs,
          images: imagesJson,
          campaignIds: merchandising.campaignIds,
          variantDisplayMode: merchandising.variantDisplayMode,
          salePrice: parseFloat(merchandising.salePrice) || 0,
          discountLabel: merchandising.discountLabel,
          variantGroups,
          variants: variants.map((variant) => ({
            sku: variant.sku,
            barcode: variant.barcode,
            price: parseFloat(variant.price) || 0,
            stock: parseInt(variant.stock || "0", 10) || 0,
            options: parseOptions(variant.options),
          })),
          ...presentationToPayload(presentation),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (Array.isArray(data.conflicts)) {
          setDuplicateConflicts(data.conflicts);
        }
        throw new Error(data.error || "Kayıt sırasında hata oluştu.");
      }

      toast.success(isEdit ? "Ürün güncellendi." : "Ürün oluşturuldu.");
      router.push(toAdminUrl("/admin/products"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kayıt tamamlanamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-48 rounded-xl bg-gray-200" />
        <div className="h-80 rounded-2xl bg-gray-200" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-5xl">
        <ProductsTabs />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-700">{loadError}</p>
          <Link href={toAdminUrl("/admin/products")} className="mt-4 inline-flex">
            <Button variant="outline">Listeye Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <ProductsTabs />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Link
              href={toAdminUrl("/admin/products")}
              className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
            >
              <ArrowLeft size={14} /> Ürün listesine dön
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEdit ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Canlı katalog için manuel ürün aç, varyantları kur ve aynı ekranda kaydet.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href={toAdminUrl("/admin/products/import")}>
              <Button variant="outline" className="w-full gap-2">
                <Upload size={15} /> Toplu Yükle
              </Button>
            </Link>
            <Link href={toAdminUrl("/admin/products")}>
              <Button variant="outline" className="w-full gap-2">
                <ArrowRightLeft size={15} /> Canlı Kataloğa Dön
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Package size={16} /> B2B Katalog
            </div>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Buradaki ürünler canlı sipariş, stok, fiyat ve bayi akışına girer. Manuel ekleme ve toplu import bu katman içindir.
            </p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
              <Layers size={16} /> Product Engine
            </div>
            <p className="mt-1 text-xs leading-5 text-indigo-700">
              Product Engine ayrı mantıktır; özel profil ve üretim odaklı çalışır. Canlı katalog ürünü eklemek için bu ekranı kullan.
            </p>
          </div>
        </div>
      </div>

      {(duplicateLoading || duplicateCheckReady) && (
        <div
          className={`rounded-2xl border p-4 shadow-sm ${
            duplicateConflicts.length > 0
              ? "border-red-200 bg-red-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {duplicateConflicts.length > 0 ? (
              <>
                <ShieldAlert size={16} className="text-red-600" />
                <span className="text-red-700">Duplicate kontrolü uyarı verdi</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="text-emerald-700">
                  {duplicateLoading ? "Kodlar kontrol ediliyor..." : "Kodlarda çakışma görünmüyor"}
                </span>
              </>
            )}
          </div>
          {duplicateConflicts.length > 0 && (
            <div className="mt-3 grid gap-2">
              {duplicateConflicts.map((conflict, index) => (
                <div key={`${conflict.field}-${conflict.value}-${index}`} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs text-red-700">
                  <strong>{conflict.label}</strong> çakışıyor: <code>{conflict.value}</code> zaten{" "}
                  <strong>{conflict.sourceProductName}</strong> ürününde kayıtlı.
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Package size={16} /> Temel Bilgiler
          </h2>
          <div className="mb-5 grid gap-3 md:grid-cols-4">
            {PRODUCT_TYPES.map((type) => {
              const active = form.productType === type;
              const labelMap: Record<string, string> = {
                physical: "Fiziksel",
                production: "Üretim",
                dealer_transfer: "Bayi / Aktarılabilir",
                digital: "Dijital",
              };
              const descMap: Record<string, string> = {
                physical: "Kargo, stok ve adres akışıyla çalışan klasik ürün.",
                production: "Üretim merkezine giden, operasyon odaklı işlenen ürün.",
                dealer_transfer: "Bayiye aktarılabilir, paket / entegrasyon odaklı ürün.",
                digital: "Dosya, lisans, erişim linki veya manuel dijital teslim.",
              };
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      productType: type,
                      backorderable: type === "digital" ? false : current.backorderable,
                      eta: type === "digital" ? "" : current.eta,
                    }))
                  }
                  className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                    active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-white"
                  }`}
                >
                  <div className="text-sm font-semibold">{labelMap[type]}</div>
                  <p className={`mt-2 text-xs leading-5 ${active ? "text-gray-200" : "text-gray-500"}`}>{descMap[type]}</p>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Ürün Adı *</label>
              <input
                className={inputClassName}
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Marka</label>
              <input
                className={inputClassName}
                value={form.brand}
                onChange={(event) => updateForm("brand", event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Kategori</label>
              {topCategories.length > 0 ? (
                <select
                  className={inputClassName}
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                      subcategory: "",
                    }))
                  }
                >
                  <option value="">Kategori seç</option>
                  {form.category && !topCategories.some((category) => category.name === form.category) && (
                    <option value={form.category}>{form.category} (mevcut)</option>
                  )}
                  {topCategories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputClassName}
                  value={form.category}
                  onChange={(event) => updateForm("category", event.target.value)}
                  placeholder="Kategori adı"
                />
              )}
              <p className="mt-1 text-[11px] text-gray-400">Kategori Yönetimi ekranındaki canlı kategori ağacı kullanılır.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Alt Kategori</label>
              {childCategories.length > 0 ? (
                <select
                  className={inputClassName}
                  value={form.subcategory}
                  onChange={(event) => updateForm("subcategory", event.target.value)}
                >
                  <option value="">Alt kategori seç</option>
                  {form.subcategory && !childCategories.some((category) => category.name === form.subcategory) && (
                    <option value={form.subcategory}>{form.subcategory} (mevcut)</option>
                  )}
                  {childCategories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputClassName}
                  value={form.subcategory}
                  onChange={(event) => updateForm("subcategory", event.target.value)}
                  placeholder="Alt kategori"
                />
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Fiyat (₺) *</label>
              <input
                type="number"
                step="0.01"
                className={inputClassName}
                value={form.price}
                onChange={(event) => updateForm("price", event.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">KDV Oranı (%)</label>
              <input
                type="number"
                step="0.01"
                className={inputClassName}
                value={form.vatRate}
                onChange={(event) => updateForm("vatRate", event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="vatIncluded"
                type="checkbox"
                className="rounded border-gray-300"
                checked={form.vatIncluded}
                onChange={(event) => updateForm("vatIncluded", event.target.checked)}
              />
              <label htmlFor="vatIncluded" className="text-xs font-semibold uppercase text-gray-600">
                Fiyat KDV dahil
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Stok *</label>
              <input
                type="number"
                className={inputClassName}
                value={form.stock}
                onChange={(event) => updateForm("stock", event.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Min Stok Uyarısı</label>
              <input
                type="number"
                className={inputClassName}
                value={form.minStockLevel}
                onChange={(event) => updateForm("minStockLevel", event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Maks Stok Limiti</label>
              <input
                type="number"
                className={inputClassName}
                value={form.maxStockLevel}
                onChange={(event) => updateForm("maxStockLevel", event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Etiketler</label>
              <input
                className={inputClassName}
                value={form.tags}
                onChange={(event) => updateForm("tags", event.target.value)}
                placeholder="etiket1, etiket2"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Ağırlık (kg)</label>
              <input
                type="number"
                step="0.01"
                className={inputClassName}
                value={form.weight}
                onChange={(event) => updateForm("weight", event.target.value)}
                disabled={isDigitalProduct}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Boyutlar</label>
              <input
                className={inputClassName}
                value={form.dimensions}
                onChange={(event) => updateForm("dimensions", event.target.value)}
                placeholder="100x50x20 cm"
                disabled={isDigitalProduct}
              />
            </div>
            <div className={`flex items-center gap-2 ${isDigitalProduct ? "opacity-50" : ""}`}>
              <input
                id="backorderable"
                type="checkbox"
                className="rounded border-gray-300"
                checked={form.backorderable}
                disabled={isDigitalProduct}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    backorderable: event.target.checked,
                    eta: event.target.checked ? current.eta : "",
                  }))
                }
              />
              <label htmlFor="backorderable" className="text-xs font-semibold uppercase text-gray-600">
                Ön siparişe izin ver
              </label>
            </div>
            {form.backorderable && !isDigitalProduct && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Tahmini Teslimat</label>
                <input
                  className={inputClassName}
                  value={form.eta}
                  onChange={(event) => updateForm("eta", event.target.value)}
                  placeholder="15-20 iş günü"
                />
              </div>
            )}
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Açıklama</label>
            <textarea
              className={inputClassName}
              rows={4}
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
            />
          </div>
        </div>

        {isDigitalProduct && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-900">
              <Download size={16} /> Dijital Teslim
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-indigo-900/80">Teslim Modeli</label>
                <select
                  className={inputClassName}
                  value={form.digitalDeliveryMode}
                  onChange={(event) => updateForm("digitalDeliveryMode", event.target.value)}
                >
                  <option value="">Teslim modeli seç</option>
                  {DIGITAL_DELIVERY_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {digitalModeLabel(mode)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-indigo-900/80">Görünen Dosya / Varlık Adı</label>
                <input
                  className={inputClassName}
                  value={form.digitalAssetName}
                  onChange={(event) => updateForm("digitalAssetName", event.target.value)}
                  placeholder="E-kitap PDF, Kurulum Paketi, Eğitim Erişimi"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-indigo-900/80">
                  {form.digitalDeliveryMode === "license" ? "Lisans / Aktivasyon İçeriği" : "Dosya / Erişim Linki"}
                </label>
                <div className="relative">
                  <input
                    className={`${inputClassName} pl-10`}
                    value={form.digitalAssetUrl}
                    onChange={(event) => updateForm("digitalAssetUrl", event.target.value)}
                    placeholder={
                      form.digitalDeliveryMode === "external_access"
                        ? "https://..."
                        : form.digitalDeliveryMode === "download"
                          ? "/uploads/... veya harici link"
                          : "Opsiyonel link"
                    }
                  />
                  <Link2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-indigo-900/80">Lisans Anahtarı / Şablon / İçerik</label>
                <div className="relative">
                  <textarea
                    className={`${inputClassName} min-h-[110px] pl-10`}
                    value={form.digitalLicenseTemplate}
                    onChange={(event) => updateForm("digitalLicenseTemplate", event.target.value)}
                    placeholder="ABC-123-XYZ veya müşteriye gösterilecek özel erişim metni"
                  />
                  <KeyRound size={15} className="pointer-events-none absolute left-3 top-4 text-indigo-400" />
                </div>
              </div>
              {form.digitalDeliveryMode === "license" ? (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase text-indigo-900/80">Lisans Havuzu (satır satır)</label>
                  <textarea
                    className={`${inputClassName} min-h-[140px]`}
                    value={form.digitalLicensePoolBulk}
                    onChange={(event) => updateForm("digitalLicensePoolBulk", event.target.value)}
                    placeholder={"ABC-123-XYZ\nDEF-456-KLM\nGHI-789-PRS"}
                  />
                  <p className="mt-2 text-xs text-indigo-900/60">
                    Her satır ayrı lisans anahtarıdır. Atanmış anahtarlar korunur, boşta kalanlar otomatik arşivlenir.
                  </p>
                </div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-indigo-900/80">İndirme Limiti</label>
                <input
                  type="number"
                  className={inputClassName}
                  value={form.digitalDownloadLimit}
                  onChange={(event) => updateForm("digitalDownloadLimit", event.target.value)}
                  placeholder="0 = sınırsız"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="digitalRequiresApproval"
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={form.digitalRequiresApproval}
                  onChange={(event) => updateForm("digitalRequiresApproval", event.target.checked)}
                />
                <label htmlFor="digitalRequiresApproval" className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-indigo-900/80">
                  <Lock size={13} /> Admin onayı olmadan açılmasın
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-indigo-900/80">Teslimat Açıklaması / Kullanım Notu</label>
                <textarea
                  className={`${inputClassName} min-h-[100px]`}
                  value={form.digitalAccessInstructions}
                  onChange={(event) => updateForm("digitalAccessInstructions", event.target.value)}
                  placeholder="Satın alma sonrası müşteriye gösterilecek kullanım, kurulum veya erişim bilgisi"
                />
              </div>
            </div>
          </div>
        )}

        <ProductPresentationPanel
          value={presentation}
          onChange={setPresentation}
          category={form.category}
        />

        <ProductImagesField
          image={form.image}
          imagesJson={imagesJson}
          onChange={(image, json) => {
            setForm((current) => ({ ...current, image }));
            setImagesJson(json);
          }}
        />

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Barcode size={16} /> Kodlar
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Model Kodu</label>
              <input
                className={inputClassName}
                value={form.modelCode}
                onChange={(event) => updateForm("modelCode", event.target.value)}
                placeholder="camtablo-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">SKU</label>
              <div className="flex gap-1">
                <input
                  className={inputClassName}
                  value={form.sku}
                  onChange={(event) => updateForm("sku", event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => updateForm("sku", genSKU(form.category || "CAT", form.name || "URUN"))}
                  className="rounded-lg bg-gray-100 px-2 py-2 text-xs transition-colors hover:bg-gray-200"
                >
                  <Hash size={14} />
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Barkod</label>
              <div className="flex gap-1">
                <input
                  className={inputClassName}
                  value={form.barcode}
                  onChange={(event) => updateForm("barcode", event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => updateForm("barcode", genBarcode())}
                  className="rounded-lg bg-gray-100 px-2 py-2 text-xs transition-colors hover:bg-gray-200"
                >
                  <Barcode size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <ProductMerchandisingPanel
          value={merchandising}
          onChange={setMerchandising}
          productId={productId}
          category={form.category}
          variantGroups={variantGroups}
          onNormalizeOptions={(groups) => {
            setVariantGroups(groups);
            setVariants((current) => buildVariantsFromGroups(groups, current, form.modelCode || form.sku || form.name, form.price));
          }}
          onLoadCamTabloEbat={loadCamTabloEbat}
        />

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Varyant Matrisi</h2>
              <p className="mt-1 text-xs text-gray-400">
                Grup ve seçenekleri kur, sonra kombinasyonları aynı yerde üret.
              </p>
            </div>
            <Button type="button" variant="outline" className="gap-2" onClick={regenerateVariants}>
              <Wand2 size={14} /> Kombinasyonları Yenile
            </Button>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              className={inputClassName}
              placeholder="Grup adı (Boyut, Renk, Materyal)"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addGroup();
                }
              }}
            />
            <button
              type="button"
              onClick={addGroup}
              className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-800"
            >
              <Plus size={14} className="mr-1 inline" /> Grup Ekle
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {variantGroups.map((group, groupIndex) => (
              <div key={`${group.name}-${groupIndex}`} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">{group.name}</span>
                  <button type="button" onClick={() => removeGroup(groupIndex)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {group.options.map((option, optionIndex) => (
                    <span key={`${option}-${optionIndex}`} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700">
                      {option}
                      <button type="button" onClick={() => removeOption(groupIndex, optionIndex)} className="text-gray-400 hover:text-red-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-gray-400 focus:outline-none"
                    placeholder="Seçenek ekle (örn: 30x40)"
                    value={newOptionInputs[groupIndex] || ""}
                    onChange={(event) =>
                      setNewOptionInputs((current) => ({ ...current, [groupIndex]: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addOption(groupIndex);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addOption(groupIndex)}
                    className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    Ekle
                  </button>
                </div>
              </div>
            ))}
          </div>

          {variants.length > 0 && (
            <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Varyant</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">SKU</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Barkod</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Fiyat</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {variants.map((variant, index) => {
                    const options = parseOptions(variant.options);
                    return (
                      <tr key={`${optionsKey(variant.options)}-${index}`} className="hover:bg-gray-50/60">
                        <td className="px-3 py-2 font-medium text-gray-700">
                          {options.map((option) => `${option.group}: ${option.value}`).join(" | ")}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                            value={variant.sku}
                            onChange={(event) =>
                              setVariants((current) =>
                                current.map((item, currentIndex) =>
                                  currentIndex === index ? { ...item, sku: event.target.value } : item,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                            value={variant.barcode}
                            onChange={(event) =>
                              setVariants((current) =>
                                current.map((item, currentIndex) =>
                                  currentIndex === index ? { ...item, barcode: event.target.value } : item,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            className="w-24 rounded border border-gray-200 px-2 py-1 text-xs"
                            value={variant.price}
                            onChange={(event) =>
                              setVariants((current) =>
                                current.map((item, currentIndex) =>
                                  currentIndex === index ? { ...item, price: event.target.value } : item,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="w-20 rounded border border-gray-200 px-2 py-1 text-xs"
                            value={variant.stock}
                            onChange={(event) =>
                              setVariants((current) =>
                                current.map((item, currentIndex) =>
                                  currentIndex === index ? { ...item, stock: event.target.value } : item,
                                ),
                              )
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Ürün Özellikleri</h2>
            <button
              type="button"
              onClick={addSpec}
              className="inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-900"
            >
              <Plus size={12} /> Özellik Ekle
            </button>
          </div>
          {specs.length === 0 ? (
            <p className="text-xs text-gray-400">Henüz özellik eklenmedi.</p>
          ) : (
            <div className="space-y-2">
              {specs.map((spec, index) => (
                <div key={`${spec.key}-${index}`} className="flex items-center gap-2">
                  <input
                    className={`${inputClassName} flex-1`}
                    placeholder="Özellik adı"
                    value={spec.key}
                    onChange={(event) =>
                      setSpecs((current) =>
                        current.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, key: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <input
                    className={`${inputClassName} flex-1`}
                    placeholder="Değer"
                    value={spec.value}
                    onChange={(event) =>
                      setSpecs((current) =>
                        current.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, value: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <button type="button" onClick={() => removeSpec(index)} className="p-2 text-red-500 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={submitDisabled} className="gap-2">
            <Save size={14} />
            {submitting ? "Kaydediliyor..." : isEdit ? "Ürünü Güncelle" : "Ürünü Kaydet"}
          </Button>
          <Link href={toAdminUrl("/admin/products")}>
            <Button type="button" variant="outline">İptal</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
