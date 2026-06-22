export type AeoAnswerBlockType =
  | "QUICK_ANSWER"
  | "AI_OVERVIEW"
  | "FAQ"
  | "COMPARISON"
  | "HOW_TO"
  | "PRODUCT_RECOMMENDATION"
  | "GEO_ANSWER"
  | "DEFINITION";

export type AeoAnswerBlock = {
  id: string;
  type: AeoAnswerBlockType;
  title: string;
  question: string;
  answer: string;
  shortAnswer: string;
  entities: string[];
  intents: string[];
  confidenceScore: number;
  sourceHints: AeoCitationHint[];
  schemaType: string | null;
  metadata: Record<string, unknown>;
};

export type AeoFaqBlock = {
  id: string;
  question: string;
  answer: string;
  shortAnswer: string;
  category: string;
  confidenceScore: number;
  sourceHints: AeoCitationHint[];
};

export type AeoSchemaHint = {
  type: string;
  priority: number;
  requiredFields: string[];
  availableFields: string[];
  missingFields: string[];
  jsonLdDraft: Record<string, unknown> | null;
};

export type AeoGeoHints = {
  country: string | null;
  province: string | null;
  district: string | null;
  locationIntent: string | null;
  localQueryVariants: string[];
  geoAnswerBlocks: AeoAnswerBlock[];
};

export type AeoCitationHint = {
  sourceType: string;
  sourceName: string;
  field: string;
  confidence: number;
};

export type AeoBlueprintPayload = {
  version: "AEO_LAYER_V1";
  productId: string;
  productName: string;
  blueprintType: string;
  primaryIntent: string;
  targetQuery: string;
  answerBlocks: AeoAnswerBlock[];
  faqBlocks: AeoFaqBlock[];
  schemaHints: AeoSchemaHint[];
  geoHints: AeoGeoHints;
  citationHints: AeoCitationHint[];
  internalLinkHints: Array<{
    anchor: string;
    targetType: string;
    targetKeyword: string;
    priority: number;
  }>;
  aeoQualityScore: number;
  noindexRecommended: boolean;
  sensitiveCategoryWarning: boolean;
  generatedAt: string;
};

export type BlueprintKind =
  | "PRODUCT_DETAIL"
  | "PRODUCT_CATEGORY"
  | "PRODUCT_INTENT"
  | "PRODUCT_GEO"
  | "PRODUCT_FAQ";

export type AeoBulkFilters = {
  generationSource?: string;
  blueprintType?: string;
  minQualityScore?: number;
  minAeoScore?: number;
  aeoStatus?: "missing" | "ready" | "low";
  limit?: number;
  dryRun?: boolean;
};
