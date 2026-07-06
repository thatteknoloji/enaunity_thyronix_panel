import type { FeedTemplate } from "@/lib/thyronix/templates";
import type { XmlFeedTemplateId } from "./types";

const ENCODING = '<?xml version="1.0" encoding="UTF-8"?>';

export const LEYNA_V2_TEMPLATE: FeedTemplate = {
  id: "leyna_v2",
  name: "Leyna XML v2",
  group: "Entegrasyon",
  rootElement: "products",
  itemElement: "product",
  variantElement: "variants",
  variantItemElement: "variant",
  xmlHeader: ENCODING,
  cdataFields: ["name", "detail", "description", "brand", "category", "image1", "image2", "image3", "image4", "image5"],
  fieldMap: {
    name: "name",
    description: "detail",
    brand: "brand",
    category: "category",
    barcode: "barcode",
    stockCode: "productCode",
    externalId: "ID",
    modelCode: "productCode",
    price: "realPrice",
    costPrice: "realPrice",
    discountedPrice: "realListPrice",
    stock: "quantity",
    currency: "currency",
    image: "image1",
    images: "image1",
    vatRate: "tax",
    deliveryTime: "",
    warranty: "",
    shippingCost: "",
    productUrl: "",
    status: "",
  },
  notes: "Leyna export — realPrice=bayi alış, realListPrice=liste fiyatı",
};

export const LEYNA_TEMPLATE: FeedTemplate = {
  id: "leyna",
  name: "Leyna XML (legacy)",
  group: "Entegrasyon",
  rootElement: "products",
  itemElement: "product",
  variantElement: "variants",
  variantItemElement: "variant",
  xmlHeader: ENCODING,
  cdataFields: ["name", "detail", "brand", "category", "image1", "image2", "image3", "image4"],
  fieldMap: {
    name: "name",
    description: "detail",
    brand: "brand",
    category: "top_category",
    subcategory: "main_category",
    barcode: "barcode",
    stockCode: "productCode",
    externalId: "id",
    modelCode: "specCode1",
    price: "sitePrice",
    costPrice: "listPrice",
    stock: "quantity",
    currency: "currency",
    image: "image1",
    images: "image1",
    vatRate: "tax",
    deliveryTime: "",
    warranty: "",
    shippingCost: "",
    productUrl: "",
    status: "",
  },
};

export const GENERIC_XML_TEMPLATE: FeedTemplate = {
  id: "generic",
  name: "Generic XML",
  group: "Genel",
  rootElement: "products",
  itemElement: "product",
  xmlHeader: ENCODING,
  cdataFields: ["name", "description", "brand", "category"],
  fieldMap: {
    name: "name",
    description: "description",
    brand: "brand",
    category: "category",
    barcode: "barcode",
    stockCode: "sku",
    modelCode: "modelCode",
    externalId: "id",
    price: "price",
    stock: "stock",
    currency: "currency",
    image: "image",
    images: "image",
    vatRate: "tax",
    deliveryTime: "",
    warranty: "",
    shippingCost: "",
    productUrl: "",
    status: "",
  },
};

export const DEFAULT_FIELD_MAPPINGS: Record<XmlFeedTemplateId, Record<string, string>> = {
  leyna_v2: {
    externalId: "ID",
    modelCode: "productCode",
    name: "name",
    description: "detail",
    brand: "brand",
    category: "category",
    barcode: "barcode",
    priceBase: "realPrice",
    listPrice: "realListPrice",
    stock: "quantity",
    vatRate: "tax",
    currency: "currency",
    image1: "image1",
    image2: "image2",
    image3: "image3",
    image4: "image4",
    image5: "image5",
  },
  leyna: {
    externalId: "id",
    modelCode: "productCode",
    name: "name",
    description: "detail",
    brand: "brand",
    category: "top_category",
    barcode: "barcode",
    priceBase: "sitePrice",
    listPrice: "listPrice",
    stock: "quantity",
    vatRate: "tax",
    currency: "currency",
    image1: "image1",
  },
  generic: {
    externalId: "id",
    modelCode: "modelCode",
    name: "name",
    description: "description",
    brand: "brand",
    category: "category",
    barcode: "barcode",
    priceBase: "price",
    stock: "stock",
    image1: "image",
  },
  ikas: {
    externalId: "id",
    modelCode: "id",
    name: "name",
    description: "description",
    brand: "brand",
    category: "category_path",
    barcode: "barcode",
    priceBase: "sellPrice",
    stock: "stock",
    image1: "imageUrl",
  },
  custom: {},
};

export const DEFAULT_VARIANT_MAPPINGS: Record<XmlFeedTemplateId, Record<string, string>> = {
  leyna_v2: {
    variantOption1Name: "name1",
    variantOption1Value: "value1",
    variantOption2Name: "name2",
    variantOption2Value: "value2",
    variantStock: "quantity",
    variantBarcode: "barcode",
    variantPriceBase: "realPrice",
  },
  leyna: {
    variantOption1Name: "name1",
    variantOption1Value: "value1",
    variantOption2Name: "name2",
    variantOption2Value: "value2",
    variantStock: "quantity",
    variantBarcode: "barcode",
  },
  generic: {},
  ikas: {
    variantSku: "sku",
    variantBarcode: "barcode",
    variantStock: "stockCount",
    variantPriceBase: "sellPrice",
    variantImage: "imageUrl",
  },
  custom: {},
};

export function getFeedTemplate(templateId: string): FeedTemplate {
  switch (templateId) {
    case "leyna_v2":
      return LEYNA_V2_TEMPLATE;
    case "leyna":
      return LEYNA_TEMPLATE;
    case "ikas":
      return GENERIC_XML_TEMPLATE;
    case "generic":
    case "custom":
    default:
      return GENERIC_XML_TEMPLATE;
  }
}

export function buildCustomFieldMap(mapping: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const internalToThyronix: Record<string, string> = {
    externalId: "externalId",
    modelCode: "modelCode",
    name: "name",
    description: "description",
    brand: "brand",
    category: "category",
    barcode: "barcode",
    priceBase: "price",
    listPrice: "discountedPrice",
    stock: "stock",
    vatRate: "vatRate",
    currency: "currency",
    image1: "image",
    image2: "image",
    image3: "image",
    image4: "image",
    image5: "image",
  };
  for (const [internal, xmlTag] of Object.entries(mapping)) {
    if (!xmlTag) continue;
    const thyronixField = internalToThyronix[internal] || internal;
    out[xmlTag] = thyronixField;
  }
  return out;
}

/** XML varyant tag → thyronix parser rolü (variantBarcode, variantGroup, …) */
export function buildVariantFieldMap(mapping: Record<string, string>): Record<string, string> {
  const internalToRole: Record<string, string> = {
    variantOption1Name: "variantGroup",
    variantOption1Value: "variantValue",
    variantOption2Name: "variantGroup",
    variantOption2Value: "variantValue",
    variantBarcode: "variantBarcode",
    variantSku: "variantSku",
    variantStock: "variantStock",
    variantPriceBase: "variantPrice",
    variantImage: "variantImage",
  };
  const out: Record<string, string> = {};
  for (const [internal, xmlTag] of Object.entries(mapping)) {
    if (!xmlTag?.trim()) continue;
    const role = internalToRole[internal];
    if (role) out[xmlTag.trim()] = role;
  }
  return out;
}
