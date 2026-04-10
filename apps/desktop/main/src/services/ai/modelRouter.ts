import { type ServiceResult } from "../shared/ipcResult";
import type { ModelConfigService } from "./modelConfig";
import type { ProviderConfig } from "./providerResolver";

export type ModelTaskType = "generation" | "auxiliary";

export type ModelRoutingRequest = {
  skillId: string;
  taskType?: ModelTaskType;
  estimatedTokens?: number;
  preferredModel?: string;
};

export type RoutedProviderConfig = ProviderConfig & {
  providerId: ProviderConfig["provider"];
  model: string;
  maxTokens: number;
  temperature: number;
  taskType: ModelTaskType;
};

export type ModelRouter = {
  selectProvider: (
    request: ModelRoutingRequest,
  ) => Promise<ServiceResult<RoutedProviderConfig>>;
};

const AUXILIARY_SKILL_HINTS = [
  "summary",
  "summarize",
  "classification",
  "classify",
  "extract",
  "judge",
  "tag",
  "rewrite-title",
] as const;

function inferTaskType(skillId: string): ModelTaskType {
  const lowered = skillId.toLowerCase();
  return AUXILIARY_SKILL_HINTS.some((hint) => lowered.includes(hint))
    ? "auxiliary"
    : "generation";
}

export function createModelRouter(args: {
  modelConfigService: ModelConfigService;
  resolveProvider: () => Promise<
    ServiceResult<{ primary: ProviderConfig; backup: ProviderConfig | null }>
  >;
  maxTokens?: number;
  temperature?: number;
}): ModelRouter {
  const maxTokens = args.maxTokens ?? 4096;
  const temperature = args.temperature ?? 0.7;

  async function selectProvider(
    request: ModelRoutingRequest,
  ): Promise<ServiceResult<RoutedProviderConfig>> {
    const providerRes = await args.resolveProvider();
    if (!providerRes.ok) {
      return providerRes;
    }

    const modelRes = args.modelConfigService.resolve();
    if (!modelRes.ok) {
      return modelRes;
    }

    const taskType = request.taskType ?? inferTaskType(request.skillId);
    const model =
      taskType === "auxiliary"
        ? modelRes.data.auxiliaryModel
        : modelRes.data.primaryModel;

    return {
      ok: true,
      data: {
        ...providerRes.data.primary,
        providerId: providerRes.data.primary.provider,
        model,
        maxTokens,
        temperature,
        taskType,
      },
    };
  }

  return {
    selectProvider,
  };
}
