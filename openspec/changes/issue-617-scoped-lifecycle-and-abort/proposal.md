# 提案：issue-617-scoped-lifecycle-and-abort

更新时间：2026-02-23 23:54

## 背景

后端审计显示：项目切换 teardown 近似 no-op、多个 Map/Watcher/会话状态只进不出；同时 IPC timeout 仅拒绝 Promise，底层 handler 仍继续执行，形成“幽灵执行”与竞态风险。需要一个统一的“App / Project / Session”三层生命周期模型，并将 AbortController 贯穿 IPC 与后台任务执行链路，确保可取消、可回收、可复现。

## 变更内容

- 引入三层 ScopedLifecycle（App / Project / Session）的统一模型与可注册接口。
- ProjectLifecycle 作为项目级注册中心：在 `project:switch` 时统一执行 `unbind → db 写入 → bind` 序列，并对 teardown 有超时保护。
- IPC timeout/取消与 AbortController 联动：超时不止返回错误，还要中止底层执行，避免“幽灵任务”持续占用 CPU/IO。
- 会话级资源（并发槽位、执行队列）在 timeout/abort/异常路径可回收，避免永久占用。
- project-scoped cache/watcher 在项目切换 unbind 时释放并停止接收事件。

## 受影响模块

- project-management — 项目切换必须触发资源卸载/绑定的可验证流程
- ipc — timeout/取消语义必须与底层执行绑定（AbortController）
- skill-system — 会话级资源（并发槽位、执行队列）必须可回收
- context-engine — project-scoped cache/watcher 必须可在切换时释放

## 不做什么

- 不在本 change 内引入 UtilityProcess（基础设施在 `issue-617-utilityprocess-foundation`）。
- 不在本 change 内重写 KG/RAG/Skill 的具体算法（由对应 change 覆盖）。
- 不改变外部 IPC 通道定义（仅增强取消/超时的可验证语义）。
- 不在本 change 内引入 BoundedMap/LRU/TTL 抽象；若需要治理无界 Map，必须单独提案并建立对应 delta spec + TDD Mapping。

## 依赖关系

- 上游依赖：无（可与 UtilityProcess 并行推进；但若底层执行迁移到 UtilityProcess，需要适配）
- 下游依赖：
  - `issue-617-kg-query-engine-refactor`
  - `issue-617-embedding-rag-offload`
  - `issue-617-skill-runtime-hardening`
  - `issue-617-ai-stream-write-guardrails`

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `openspec/changes/issue-617-scoped-lifecycle-and-abort/specs/project-management/spec.md`
  - `openspec/changes/issue-617-scoped-lifecycle-and-abort/specs/ipc/spec.md`
  - `openspec/changes/issue-617-scoped-lifecycle-and-abort/specs/skill-system/spec.md`
  - `openspec/changes/issue-617-scoped-lifecycle-and-abort/specs/context-engine/spec.md`
  - `openspec/changes/issue-617-scoped-lifecycle-and-abort/tasks.md`
  - `openspec/specs/project-management/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `openspec/specs/skill-system/spec.md`
  - `openspec/specs/context-engine/spec.md`
  - `openspec/changes/issue-617-skill-runtime-hardening/specs/skill-system/spec.md`（重叠点核对）
  - `openspec/changes/EXECUTION_ORDER.md`
- 核对项：
  - 项目切换必须触发 project-scoped 资源卸载；未卸载的资源列为阻断级缺陷。
  - timeout/取消必须中止底层执行（AbortController/信号传递），不得仅 reject 外层 Promise。
  - 会话级并发槽位必须在异常路径可回收（避免永久占用）。
- 结论：`PASS`
  - 已补齐跨模块 delta spec 覆盖（`ipc` / `skill-system` / `context-engine`）。
  - 已标注 BE-SLA-S3 与 `issue-617-skill-runtime-hardening`（BE-SRH-S3/S4）的重叠关系：后者为更强约束，若同时推进必须避免重复/冲突实现。

## 来源映射

| 来源                                          | 提炼结论                                                               | 落地位置                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Issue #627 + 本 change 的 Scenarios           | BE-SLA-S1/S2/S3/S4 作为实现验收契约                                   | `specs/**/spec.md`、`tasks.md`                                      |
| `openspec/specs/ipc/spec.md`                  | IPC 层已有 timeout 错误码与可测试性基线，需要补齐 timeout->abort 契约 | `specs/ipc/spec.md`、`tasks.md`                                     |
| `openspec/specs/skill-system/spec.md`         | Skill 已定义超时中断与队列/并发阈值，需要补齐异常路径槽位回收契约      | `specs/skill-system/spec.md`、`tasks.md`                            |
| `openspec/specs/context-engine/spec.md`       | Context Engine 具备 projectId 隔离规则，需要补齐解绑清理与回归验证点  | `specs/context-engine/spec.md`、`tasks.md`                          |

## 审阅状态

- Owner 审阅：`ACCEPTED`（2026-02-23 23:54：本 change 范围已锁定；BoundedMap 已显式 de-scope；BE-SLA-S2/S3/S4 的跨模块 delta spec 已补齐；BE-SLA-S3 与 `issue-617-skill-runtime-hardening` 的重叠点已在 spec 中声明边界，允许进入 Red 阶段）
