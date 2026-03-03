# Proposal: fe-composites-p2-empties-and-confirms

引用自 `openspec/changes/fe-composites-p2-empties-and-confirms/proposal.md`。

## 概要

新增三个 P2 Composite 组件：

1. **EmptyState** — 统一空状态展示（icon + title + description + action）
2. **ConfirmDialog** — 基于 Dialog Primitive 的确认弹窗（支持 destructive 语义）
3. **InfoBar** — 面板内提示条（variant 驱动样式 + action + dismiss）

同时迁移 Feature 层散装空状态和确认弹窗至对应 Composite。
