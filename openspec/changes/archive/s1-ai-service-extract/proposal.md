# 提案：s1-ai-service-extract

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 1 将 `s1-ai-service-extract`（A7-C-002 + A5-H-003）定义为 AI Service 架构解锁项：`createAiService` 当前承载配置解析、provider 路由、错误映射与运行调度，文件体量和复杂度过高，已成为后续演进（尤其是错误解耦与能力扩展）的主要阻塞点。

若继续在单体上叠加功能，会放大回归面并提高定位成本，违背 Sprint 1 “Extract-Then-Extend”的治理目标。

## 变更内容

- 提取 `runtimeConfig` 子模块：收口 token 估算、系统提示拼接与运行时阈值解析等纯函数。
- 提取 `errorMapper` 子模块：收口上游状态到 IPC 错误码映射，统一错误转换入口。
- 提取 `providerResolver` 子模块：收口 provider 路由与健康状态管理，改为显式工厂创建并保持状态封装。
- 将 `aiService.ts` 收敛为聚合层，保留 `createAiService` 外部接口与行为语义不变。

## 受影响模块

- AI Service（`apps/desktop/main/src/services/ai/`）— `aiService.ts` 职责收敛，新增/提取 `types.ts`、`runtimeConfig.ts`、`errorMapper.ts`、`providerResolver.ts`。
- AI Service 测试（`apps/desktop/main/src/services/ai/__tests__/`）— 增补提取边界、状态隔离与对外契约回归测试。

## 依赖关系

- 上游依赖：无硬依赖（roadmap 标注为独立项）。
- 执行建议：建议在 `s1-path-alias` 之后实施，并与 `s1-runtime-config` 错峰合入，降低同文件冲突。
- 下游依赖：`s2-service-error-decouple` 建议建立在本 change 的模块边界之上推进。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s1-ai-service-extract` 条目与 Sprint 1 依赖图。
  - `openspec/specs/ai-service/spec.md` 中 LLM 调用、流式链路与错误处理相关契约。
  - 活跃变更 `s1-runtime-config`、`s1-path-alias` 的边界定义（避免职责重叠与路径漂移）。
- 核对项：
  - 提取范围限定在 `runtimeConfig/errorMapper/providerResolver`，不扩展业务能力。
  - `createAiService` 外部接口（方法签名、返回包络、通道语义）保持不变。
  - provider 运行时状态必须由 resolver 实例持有，不得回退为模块级共享可变状态。
- 结论：`NO_DRIFT`（可进入 TDD 规划）。

## 踩坑提醒（防复发）

- `runtimeConfig`/`errorMapper` 必须保持纯函数；避免读取隐藏全局状态导致行为漂移。
- `providerResolver` 提取后要防止“复制旧逻辑 + 保留旧分支”形成双路径；必须以单一路径委托为准。
- 对外契约回归需覆盖 `runSkill/cancel/listModels` 三条主链路，避免“内部重构导致外部响应包络变化”。

## 防治标签

- `MONOLITH` `ADDONLY` `OVERABS` `DUP` `FAKETEST`

## 不做什么

- 不在本 change 内新增 provider、修改模型选择策略或调整重试/退避产品策略。
- 不改 IPC 通道命名、错误码字典定义与前端 AI 面板交互协议。
- 不处理 Sprint 2 的服务错误体系解耦（该项留给 `s2-service-error-decouple`）。

## 审阅状态

- Owner 审阅：`PENDING`
