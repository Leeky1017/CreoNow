# 提案：editor-p4-a11y-hardening

## 背景

Editor 模块全部功能（p0–p3）就绪后，需要统一硬化无障碍性、性能指标、异常矩阵与 NFR 场景，确保模块达到可验收标准。

## 变更内容

- 无障碍性硬化：
  - 工具栏按钮 `aria-label`，toggle 按钮 `aria-pressed`。
  - 大纲面板 `role="tree"` / `role="treeitem"` + `aria-selected` + `aria-expanded`。
  - 键盘导航：Tab 聚焦、Arrow 列表导航、Enter 激活、Escape 关闭。
  - 焦点环 `--color-ring-focus` / `--ring-focus-width` / `--ring-focus-offset`，仅 `:focus-visible`。
- 性能验收：
  - 键入渲染 p95 < 16ms（60fps）。
  - 自动保存 p95 < 500ms。
  - Diff 面板打开 p95 < 200ms。
- 异常矩阵覆盖：
  - 网络/IO：IPC 保存失败、文档读取失败。
  - 数据异常：TipTap JSON 非法、selectionRef 失配。
  - 并发冲突：自动保存与手动保存竞态、Diff 应用与撤销并发。
  - 容量溢出：超长文档（1,000,000 字符）、超大粘贴（2MB）。
  - 权限/安全：非当前项目文档写入、非法快捷键注入。
- NFR 场景绑定到可测条目：
  - 大纲重算取消旧任务。
  - 文档容量超限提示。
  - 自动保存与手动保存竞态 → 手动优先。
  - 超大粘贴分块处理。

## 受影响模块

- Editor 全子模块（editor/outline/diff/zen-mode）

## 依赖关系

- 上游依赖：`editor-p0` ~ `editor-p3`（全部 Editor 功能）
- 下游依赖：无

## 不做什么

- 不新增功能特性
- 不修改已通过的外部行为契约

## 审阅状态

- Owner 审阅：`PENDING`
