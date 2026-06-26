export type AnalysisWorkspaceConfig = {
  apiPath: string;
  badgeLabel: string;
  title: string;
  description: string;
  countCardLabel: string;
  productPickerLabel: string;
  productPickerButton: string;
  productPickerHelp: string;
  productAnalysisPickerLabel: string;
  productAnalysisPickerButton: string;
  productAnalysisPickerHelp: string;
  loadingSourceLabel: string;
  /** cache = gerçek marketplace-intelligence kârlılık sekmesi (dealer) */
  profitMode?: "legacy" | "cache";
};
