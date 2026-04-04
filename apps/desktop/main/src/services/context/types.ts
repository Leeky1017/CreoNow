export type ContextLayerId = "rules" | "settings" | "retrieved" | "immediate";

export type ContextAssembleRequest = {
  projectId: string;
  documentId: string;
  cursorPosition: number;
  /** Plain-text character offset of the cursor (number of text chars before cursor).
   * When provided, the immediate layer fetcher uses this for text slicing instead of
   * `cursorPosition` (which is a ProseMirror document position, not a text offset).
   * Set by the IPC layer after converting PM pos → text offset via the document model. */
  textOffset?: number;
  /**
   * When true, `additionalInput` contains the user's selection text and must NOT be
   * truncated at textOffset.  Selection-based skills (polish, rewrite, etc.) set this
   * so the immediate layer returns the full selection text as-is.
   */
  additionalInputIsSelection?: boolean;
  skillId: string;
  additionalInput?: string;
  provider?: string;
  model?: string;
  tokenizerVersion?: string;
  conversationMessages?: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string;
  }>;
};

export type ContextInspectRequest = ContextAssembleRequest & {
  debugMode?: boolean;
  requestedBy?: string;
  callerRole?: string;
};

export type ContextConstraintSource = "user" | "kg";

export type ContextRuleConstraint = {
  id: string;
  text: string;
  source: ContextConstraintSource;
  priority: number;
  updatedAt: string;
  degradable?: boolean;
};

export type ContextLayerChunk = {
  source: string;
  content: string;
  projectId?: string;
  constraints?: ContextRuleConstraint[];
};

export type ContextConstraintTrimLog = {
  constraintId: string;
  reason: "KG_LOW_PRIORITY" | "USER_DEGRADABLE";
  tokenFreed: number;
};

export type ContextLayerFetchResult = {
  chunks: ContextLayerChunk[];
  truncated?: boolean;
  warnings?: string[];
};

export type ContextLayerFetcher = (
  request: ContextAssembleRequest,
) => Promise<ContextLayerFetchResult>;

export type ContextLayerFetcherMap = {
  rules: ContextLayerFetcher;
  settings: ContextLayerFetcher;
  retrieved: ContextLayerFetcher;
  immediate: ContextLayerFetcher;
};

export type ContextLayerSummary = {
  source: string[];
  tokenCount: number;
  truncated: boolean;
  warnings?: string[];
};

export type ContextLayerDetail = ContextLayerSummary & {
  content: string;
};

export type ContextCompressedHistorySummary = ContextLayerSummary & {
  compressed: boolean;
  compressionRatio?: number;
};

export type ContextCompressedHistoryDetail = ContextLayerDetail & {
  compressed: boolean;
  compressionRatio?: number;
};

export type ContextAssembleLayers = {
  rules: ContextLayerSummary;
  compressedHistory: ContextCompressedHistorySummary;
  immediate: ContextLayerSummary;
};

export type ContextAssembleResult = {
  prompt: string;
  tokenCount: number;
  stablePrefixHash: string;
  stablePrefixUnchanged: boolean;
  warnings: string[];
  capacityPercent: number;
  layers: ContextAssembleLayers;
  compressionApplied?: boolean;
};

export type ContextInspectLayerDetails = {
  rules: ContextLayerDetail;
  compressedHistory: ContextCompressedHistoryDetail;
  immediate: ContextLayerDetail;
};

export type ContextInspectResult = {
  layersDetail: ContextInspectLayerDetails;
  totals: {
    tokenCount: number;
    warningsCount: number;
  };
  inspectMeta: {
    debugMode: boolean;
    requestedBy: string;
    requestedAt: number;
  };
};

export type ContextBudgetLayerConfig = {
  ratio: number;
  minimumTokens: number;
};

export type ContextBudgetProfile = {
  version: number;
  tokenizerId: string;
  tokenizerVersion: string;
  totalBudgetTokens: number;
  layers: Record<ContextLayerId, ContextBudgetLayerConfig>;
};

export type ContextBudgetUpdateRequest = {
  version: number;
  tokenizerId: string;
  tokenizerVersion: string;
  layers: Record<ContextLayerId, ContextBudgetLayerConfig>;
};

export type ContextBudgetUpdateErrorCode =
  | "CONTEXT_BUDGET_INVALID_RATIO"
  | "CONTEXT_BUDGET_INVALID_MINIMUM"
  | "CONTEXT_BUDGET_CONFLICT"
  | "CONTEXT_TOKENIZER_MISMATCH";

export type ContextBudgetUpdateResult =
  | { ok: true; data: ContextBudgetProfile }
  | {
      ok: false;
      error: { code: ContextBudgetUpdateErrorCode; message: string };
    };

export type ContextLayerAssemblyService = {
  assemble: (request: ContextAssembleRequest) => Promise<ContextAssembleResult>;
  inspect: (request: ContextInspectRequest) => Promise<ContextInspectResult>;
  getBudgetProfile: () => ContextBudgetProfile;
  updateBudgetProfile: (
    request: ContextBudgetUpdateRequest,
  ) => ContextBudgetUpdateResult;
};
