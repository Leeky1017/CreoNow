# 提案：s3-export

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 3 将 `s3-export`（AR-C34）定义为“Markdown/TXT/DOCX 导出”。现有导出能力骨架不完整，用户无法稳定获取三种目标格式，且失败场景容易退化为表面成功。

## 变更内容

- 在导出服务中补齐 Markdown/TXT/DOCX 三种格式的导出实现。
- 完善导出 UI 与服务调用联动，支持用户触发并感知导出状态。
- 明确导出失败错误语义，禁止静默降级为“空文件/假成功”。

## 受影响模块

- Document Management（`apps/desktop/main/src/services/export/`）— 导出格式实现。
- Document Management（`apps/desktop/renderer/src/features/export/`）— 导出交互与状态反馈。
- 导出 IPC 链路（`export:*`）— 保持契约不变下的行为补齐。

## 依赖关系

- 上游依赖：无（Sprint 3 依赖图中标记独立项）。
- 并行关系：可与 `s3-search-panel`、`s3-zen-mode` 并行。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s3-export` 定义；
  - `openspec/specs/document-management/spec.md` 导出通道与行为场景。
- 核对项：
  - 仅补齐 Markdown/TXT/DOCX 导出实现，不引入新导出协议；
  - `export:document` / `export:project` 契约与错误语义保持一致；
  - 失败场景必须显式上报，禁止“默认成功”伪装。
- 结论：`NO_DRIFT`（与 AR-C34 一致，可进入 TDD）。

## 踩坑提醒（防复发）

- 导出链路常见问题是“返回成功但文件未落盘”，需做结果落地验证。
- 不能用 fallback 空内容掩盖转换失败，否则会产生静默数据损坏风险。
- 三种格式实现若分散复制，后续修复会出现行为不一致。

## 代码问题审计重点

- 来自 `docs/代码问题/虚假测试覆盖率.md`：
  - 测试必须校验导出文件内容与格式特征，不得只断言“函数返回成功”。
- 来自 `docs/代码问题/静默失败与表面正确.md`：
  - 导出失败必须返回明确错误并在 UI 可见，禁止吞错或假成功 Toast。
- 来自 `docs/代码问题/风格漂移与项目约定偏离.md`：
  - 三种导出路径统一返回结构与错误映射，保持文档管理模块一致风格。

## 防治标签

`FAKETEST` `DRIFT` `SILENT`

## 不做什么

- 不新增路线图外导出格式（如 PDF/HTML/EPUB）。
- 不改造项目打包导出协议。
- 不重写文档存储或文件树结构。

## 审阅状态

- Owner 审阅：`PENDING`
