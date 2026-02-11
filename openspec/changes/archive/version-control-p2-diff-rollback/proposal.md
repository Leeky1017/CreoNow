# 提案：version-control-p2-diff-rollback

## 背景

版本快照与预览（version-control-p0/p1）就绪后，需要实现版本对比与回滚两个核心功能。版本对比复用 Editor 模块的 `DiffViewPanel` 和 `MultiVersionCompare` 组件，回滚操作采用安全的「创建新版本」语义而非删除历史。

## 变更内容

- 实现版本对比（Diff）：
  - 入口：版本历史中选中版本后「与当前版本对比」、选中两个版本后「对比选中版本」。
  - 通过 IPC `version:snapshot:diff`（Request-Response）获取 diff 数据（命名遵循三段式 channel 治理）。
  - 复用 Editor 的 `DiffViewPanel`（Unified/Split 模式）和 `MultiVersionCompare`（2×2 网格，最多 4 版本）。
  - Diff 着色遵循 Editor spec：删除 `--color-error-subtle`，新增 `--color-success-subtle`。
  - 同步滚动支持。
  - 两个版本内容相同时显示「无差异」。
- 实现版本回滚：
  - 入口：版本历史面板或预览模式中「恢复到此版本」按钮。
  - 确认对话框：「将文档恢复到 [时间] 的版本？当前内容将被保存为新版本。」
  - 回滚流程：① 当前内容 → `pre-rollback` 快照 → ② 目标版本内容设为当前 → ③ `rollback` 快照。
  - 通过 IPC `version:snapshot:rollback`（Request-Response）完成。
  - 回滚可撤销：中间版本不删除，用户可再次回滚到 `pre-rollback`。
  - 取消确认时不创建任何快照。
- 开启 AI 修改区分时，Diff 中 AI 修改使用虚线下划线渲染。

## 受影响模块

- Version Control（`main/src/services/version/`、`main/src/ipc/version.ts`、`renderer/src/features/version-history/`）
- IPC（`version:snapshot:diff`、`version:snapshot:rollback` 通道定义）

## 依赖关系

- 上游依赖：
  - `version-control-p0-snapshot-history`（快照 CRUD、版本历史列表）
  - `version-control-p1-ai-mark-preview`（预览模式中的回滚入口、AI 标记偏好）
  - `editor-p2-diff-ai-collaboration`（DiffViewPanel / MultiVersionCompare 组件）
- 下游依赖：`version-control-p3`（分支合并复用 Diff）、`version-control-p4`

## 不做什么

- 不实现分支管理（→ version-control-p3）
- 不重新实现 Diff 组件（复用 Editor 模块）
- 不实现批量回滚

## 审阅状态

- Owner 审阅：`PENDING`
