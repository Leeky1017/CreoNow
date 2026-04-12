/**
 * SkillOrchestrator — INV-6 / INV-7 统一入口
 *
 * 职责边界：
 *   - 所有 IPC handler 对 AI 能力的访问必须经过本模块。
 *   - 禁止 IPC 层直接调用 aiService / WritingOrchestrator / SkillExecutor。
 *   - AI Service 仅作为 SkillOrchestrator 的内部实现依赖，
 *     对外仅暴露 Skill 级语义（execute / cancel / recordFeedback / listModels）。
 *
 * INV 引用：
 *   - INV-6 (一切皆 Skill): 所有能力建模为 Skill，统一管线
 *   - INV-7 (统一入口): IPC handler 只调用本模块，不调用 Service
 *
 * 依赖方向（严格单向）：
 *   IPC → SkillOrchestrator → WritingOrchestrator + AiService → Provider
 */

import type {
  WritingOrchestrator,
  WritingRequest,
  WritingEvent,
} from "../services/skills/orchestrator";
import type { AiService } from "../services/ai/aiService";
import type { ServiceResult } from "../services/shared/ipcResult";

// ── Public interface ─────────────────────────────────────────────────

export interface SkillOrchestratorConfig {
  /**
   * WritingOrchestrator 实例（9 阶段写作管线）。
   * IPC 通过 execute() 消费 AsyncGenerator<WritingEvent>。
   */
  writingOrchestrator: WritingOrchestrator;
  /**
   * AI 服务实例，仅作为内部依赖。
   * cancel/feedback/listModels 的底层实现来源。
   * IPC 层禁止直接持有此引用。
   */
  aiService: AiService;
}

export interface SkillOrchestrator {
  /**
   * 执行 Skill 请求。
   * 9 阶段管线: intent-resolved → ... → hooks-done
   * 调用方通过 for-await-of 消费 WritingEvent 流。
   */
  execute(request: WritingRequest): AsyncGenerator<WritingEvent>;

  /**
   * 中止进行中的 Skill 请求（requestId 级别）。
   * 由 WritingOrchestrator 的 abort() 实现。
   */
  abort(requestId: string): void;

  /**
   * 取消正在进行的 AI 调用（executionId / runId 级别）。
   * 路由到 AiService.cancel()，对 IPC 层透明。
   *
   * Why separate from abort(): abort() 是请求级别的中止，
   * cancel() 是 AI 服务层面的取消（对应 running 状态的 runId/executionId）。
   */
  cancel(args: {
    executionId?: string;
    runId?: string;
    ts: number;
  }): ServiceResult<{ canceled: true }>;

  /**
   * 记录用户对 Skill 结果的反馈，触发偏好学习。
   * 路由到 AiService.feedback()，对 IPC 层透明。
   */
  recordFeedback(args: {
    runId: string;
    action: "accept" | "reject" | "partial";
    evidenceRef: string;
    ts: number;
  }): ServiceResult<{ recorded: true }>;

  /**
   * 列出当前可用的 AI 模型。
   * 路由到 AiService.listModels()。
   *
   * Why here: 即使是元数据查询，也应通过 SkillOrchestrator 统一出口，
   * 以确保 IPC 层不持有 aiService 引用。
   */
  listModels(): Promise<
    ServiceResult<{
      source: "proxy" | "openai" | "anthropic";
      items: Array<{ id: string; name: string; provider: string }>;
    }>
  >;

  /**
   * 销毁 orchestrator，释放内部资源。
   */
  dispose(): void;
}

// ── Factory ──────────────────────────────────────────────────────────

/**
 * 创建 SkillOrchestrator 实例。
 *
 * 设计上，SkillOrchestrator 是薄适配层而非业务逻辑层。
 * 全部核心逻辑留在 WritingOrchestrator / AiService 中，
 * 本层只负责统一出口语义和依赖隔离。
 */
export function createSkillOrchestrator(
  config: SkillOrchestratorConfig,
): SkillOrchestrator {
  return {
    execute(request: WritingRequest): AsyncGenerator<WritingEvent> {
      return config.writingOrchestrator.execute(request);
    },

    abort(requestId: string): void {
      config.writingOrchestrator.abort(requestId);
    },

    cancel(args: {
      executionId?: string;
      runId?: string;
      ts: number;
    }): ServiceResult<{ canceled: true }> {
      return config.aiService.cancel(args);
    },

    recordFeedback(args: {
      runId: string;
      action: "accept" | "reject" | "partial";
      evidenceRef: string;
      ts: number;
    }): ServiceResult<{ recorded: true }> {
      return config.aiService.feedback(args);
    },

    async listModels(): Promise<
      ServiceResult<{
        source: "proxy" | "openai" | "anthropic";
        items: Array<{ id: string; name: string; provider: string }>;
      }>
    > {
      return config.aiService.listModels();
    },

    dispose(): void {
      config.writingOrchestrator.dispose();
    },
  };
}
