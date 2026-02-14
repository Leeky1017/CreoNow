# 提案：s1-doc-service-extract

## 背景

`docs/plans/unified-roadmap.md` 将 `s1-doc-service-extract`（A7-C-001 + A5-H-002）定义为 Sprint 1 架构解锁项。当前 `createDocumentService` 体量过大，聚合了 CRUD、版本、分支、diff、合并等多职责，导致变更面集中、评审噪声高、回归定位成本高。

## 变更内容

- 新增文档服务共享类型文件，承接 Document 模块公共类型与常量。
- 将 `documentService` 的实现按职责拆分为三个子服务：`documentCrudService`、`versionService`、`branchService`。
- 保留 `documentService` 作为聚合门面，对外契约保持不变，仅将具体实现委托给子服务。
- 明确删除旧实现中已提取的重复逻辑，避免“新旧链路并存”的复制粘贴残留。

## 受影响模块

- Document Management（Main）— 文档主进程服务内部结构从单体函数调整为门面 + 子服务。
- IPC（Document Channels）— 保持现有文档 IPC 通道契约与错误语义不变。
- Version Control / Branch Flow（Main）— 版本与分支能力由独立子服务承载，但对外行为不变。
- Cross Module Integration — 新增“门面委托保持契约”的可验证约束。

## 依赖关系

- 上游依赖：无。`unified-roadmap` 将该项标记为 Sprint 1 独立 change。
- 执行建议：建议在 `s1-path-alias` 之后进行；与 `s1-ai-service-extract`、`s1-kg-service-extract` 同属 Wave 3 并行组。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s1-doc-service-extract` 条目与 Sprint 1 依赖图。
  - `openspec/specs/document-management/spec.md` 当前文档管理对外行为契约。
- 核对项：
  - 变更边界仅覆盖 DocumentService 内部职责拆分，不扩展新业务行为。
  - 对外 `DocumentService` 门面方法与 IPC 通道语义保持一致。
  - 提取后旧实现中的重复逻辑必须移除，避免双实现漂移。
- 结论：`NO_DRIFT`（与 unified-roadmap 对 `s1-doc-service-extract` 的定义一致，可进入 TDD）。

## 踩坑提醒（防复发）

- 子服务之间存在方法链式调用时（例如版本回滚依赖版本读取），提取后需保持调用顺序和事务语义一致。
- 提取时若仅新增委托而不删除旧分支，容易形成双路径行为漂移，必须在 Green 后清理旧实现。
- 门面层只能做编排与委托，避免把新业务判断塞回 `documentService.ts` 导致“名义拆分、实质回归单体”。

## 防治标签

- `MONOLITH` `ADDONLY` `OVERABS` `DUP` `FAKETEST`

## 不做什么

- 不新增 IPC 通道、不修改现有通道命名与返回结构。
- 不在本 change 内引入新的文档业务能力（仅做结构重组）。
- 不扩展 UI/Renderer 端交互与文件树行为。

## 审阅状态

- Owner 审阅：`PENDING`
