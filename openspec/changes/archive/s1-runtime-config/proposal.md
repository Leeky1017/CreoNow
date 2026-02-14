# 提案：s1-runtime-config

## 背景

`docs/plans/unified-roadmap.md` 将 `s1-runtime-config`（A7-H-009 ~ A7-H-012）定义为 Sprint 1 的运行时治理配置中心建设项。当前 `ipcGateway`、`aiService`、`kgService`、`rag` 存在分散硬编码阈值，导致跨模块预算口径不一致、线上调参路径分裂、回归验证成本升高。

## 变更内容

- 新增统一运行时治理配置入口，集中定义默认值、环境变量键、解析与回退策略。
- 将 `ipc.maxPayloadBytes`、`ai.timeoutMs`、`ai.retryBackoffMs`、`ai.sessionTokenBudget`、`kg.queryTimeoutMs`、`rag.maxTokens` 收敛到同一配置源。
- 统一约束 main/preload 对治理配置的读取语义：默认值一致、env 覆盖一致、非法 env 回退一致。

## 受影响模块

- IPC（Preload/Main）— `ipcGateway` 与 runtime validation 相关链路共享 payload 阈值语义。
- AI Service（Main）— 超时、重试退避、会话预算改为治理配置驱动。
- Knowledge Graph（Main）— 查询超时阈值改为治理配置驱动。
- Search & Retrieval（Main）— RAG `maxTokens` 改为治理配置驱动。
- Cross-Module Integration — 新增跨进程配置一致性约束与场景。

## 依赖关系

- 上游依赖：无（`unified-roadmap` 将本 change 标记为 Sprint 1 独立项）。
- 横向协同：与 `s1-ipc-acl`、`s1-context-ipc-split` 同属 Wave 2 并行组；建议保持文件边界清晰，避免互相改写非本 change 代码路径。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s1-runtime-config` 条目（A7-H-009 ~ A7-H-012）。
  - `openspec/specs/cross-module-integration-spec.md` 现有跨模块契约基线。
- 核对项：
  - 目标阈值集合与 roadmap 一致。
  - 变更边界仅覆盖运行时治理配置抽离与消费替换，不扩展业务行为。
  - preload/main 对同一 key 的默认值与回退语义保持一致。
- 结论：`NO_DRIFT`（可进入 TDD 规划）。

## 踩坑提醒（防复发）

- preload 与 main 进程环境变量可见性不同，不能假设两侧 `process.env` 读取语义天然一致。
- `CN_AI_RETRY_BACKOFF_MS` 属数组解析路径，需定义非法输入（空串、非数字、负数、混合分隔符）回退规则，避免伪通过。
- 配置中心不应吞掉非法输入信号：需保留可审计日志/诊断上下文，防止“静默回退导致假绿”。

## 防治标签

- `DUP` `OVERABS` `FAKETEST`

## 不做什么

- 不在本 change 内重构业务服务结构（如 service extract）。
- 不引入新的运行时配置存储介质（数据库/远程配置中心）。
- 不改变现有 IPC 通道命名、错误码字典与非配置相关行为。

## 审阅状态

- Owner 审阅：`PENDING`
