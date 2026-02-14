export type ContextLayerId = "rules" | "settings" | "retrieved" | "immediate";

export type ContextAssembleRequest = {
  projectId: string;
  documentId: string;
  cursorPosition: number;
  skillId: string;
  additionalInput?: string;
  provider?: string;
  model?: string;
  tokenizerVersion?: string;
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

export type ContextAssembleResult = {
  prompt: string;
  tokenCount: number;
  stablePrefixHash: string;
  stablePrefixUnchanged: boolean;
  warnings: string[];
  assemblyOrder: ContextLayerId[];
  layers: Record<ContextLayerId, ContextLayerSummary>;
};

export type ContextInspectResult = {
  layersDetail: Record<ContextLayerId, ContextLayerDetail>;
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
