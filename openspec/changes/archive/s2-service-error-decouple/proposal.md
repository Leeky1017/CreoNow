# 提案：s2-service-error-decouple

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 2（A5-M-001）指出：`documentService` 领域层直接依赖 `IpcError/IpcErrorCode`，导致业务错误语义与 IPC 传输语义耦合，阻碍服务边界治理与后续模块演进。

## 变更内容

- 在文档服务领域定义 `DocumentError`，作为 service 层统一错误表达。
- 将文档 service 返回从 IPC 错误类型切换为领域错误类型。
- 在 IPC 层增加 `DocumentError -> IpcError` 映射，保持对外通道契约稳定。

## 受影响模块

- Document Management（`apps/desktop/main/src/services/documents/types.ts`）— 增加领域错误类型。
- Document Management（`apps/desktop/main/src/services/documents/documentCrudService.ts`）— 错误返回语义改为领域错误。
- IPC 层（`apps/desktop/main/src/ipc/`）— 负责领域错误到 IPC 错误映射。

## 依赖关系

- 上游依赖：建议在 `s1-ai-service-extract` 之后实施（Sprint 2 跨组依赖建议）。
- 同组关系：债务组内部为独立项，可并行推进。
- 执行分组：位于推荐执行顺序 W5（与 `s2-debug-channel-gate` 同批）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` Sprint 2 债务组 `s2-service-error-decouple` 条目；
  - Sprint 2 跨组依赖建议（`s2-service-error-decouple -> s1-ai-service-extract`）。
- 核对项：
  - service 层仅暴露领域错误语义，不直接依赖 IPC 错误类型；
  - IPC 侧承担映射职责，避免错误语义双向渗透；
  - 对外通道契约维持稳定。
- 结论：`NO_DRIFT`（按建议依赖顺序可进入 TDD 规划）。

## 踩坑提醒（防复发）

- 防止“新增 DocumentError 但保留旧 IpcError 分支”形成双路径错误处理。
- IPC 映射需保持单入口，避免不同 handler 各自维护映射副本。
- 变更后要核对调用方仍收到统一的 IPC 错误包络，避免契约漂移。

## 防治标签

- `MONOLITH` `ADDONLY` `DUP` `FAKETEST`

## 不做什么

- 不在本 change 内重构非文档域 service 的错误体系。
- 不新增/重命名 IPC 通道。
- 不扩展文档功能行为，只调整错误边界职责。

## 审阅状态

- Owner 审阅：`PENDING`
