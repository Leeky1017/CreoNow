/**
 * @module modelRouter
 * ## 职责：根据 skill/task 类型在 primary/auxiliary 模型间进行路由，并拼装 provider 配置
 * ## 不做什么：不做 settings 持久化、不发起网络请求
 * ## 依赖方向：ai → ai(modelConfig/providerResolver) + shared(ipcResult)
 * ## 关键不变量：INV-10（provider/model 解析错误需原样透传）
 */

import { type ServiceResult } from "../shared/ipcResult";
import type { ModelConfigService } from "./modelConfig";
import type { ProviderConfig } from "./providerResolver";

export type ModelTaskType = "generation" | "auxiliary";

export type ModelRoutingRequest = {
  skillId: string;
  taskType?: ModelTaskType;
  estimatedTokens?: number; // V1-reserved: not evaluated in routing; future P2 model-tier routing
  preferredModel?: string; // V1-reserved: user-override not yet supported; see spec P1 不做清单
};

export type RoutedProviderConfig = ProviderConfig & {
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
  const maxTokens = args.maxTokens ?? 4096; // spec "额度策略": single-request maxTokens ceiling is 4096.
  const temperature = args.temperature ?? 0.7; // spec ProviderConfig interface: default generation temperature is 0.7.

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
