# Design 02 — Editor / Zen Mode

## Scope

- CNAUD-REQ-005
- CNAUD-REQ-008
- CNAUD-REQ-009
- CNAUD-REQ-014
- CNAUD-REQ-024
- CNAUD-REQ-039

## Current-State Evidence

- 编辑器扩展仍以 StarterKit 为主，缺少明确扩展基线分层。
- 编辑器正文排版未显式绑定规范中的 editor typography token。
- autosave 仍包含 cleanup fire-and-forget 与 setTimeout(..., 0) 时序路径。
- Zen Mode 当前是提取后的只读展示，不是可编辑工作面。
- Zen Mode 中存在大量硬编码颜色/inline style。
- ZenModeOverlay 内容提取依赖 editor 引用，可能出现内容新鲜度问题。

## Target Design

1. Editor Extension Baseline
   - 建立明确 extension 组合与分层（core + optional）。
   - 所有扩展能力通过 typed config 注入。

2. Typography Contract
   - editor body 必须使用 font-family-body、text-editor-size、text-editor-line-height。

3. Autosave State Machine
   - 至少具备 idle -> queued -> saving -> saved|error。
   - flush 路径必须可观测且可重试。

4. Zen Mode as Real Surface
   - 优先方案：Zen 复用同一 editor 实例（全屏化）。
   - 备选方案：单独 editor surface，但同一 document SSOT、同一 autosave/undo 语义。

5. Freshness Guarantee
   - Zen 内容来源必须订阅编辑变化，不得仅依赖 editor 引用稳定性。

## Verification Gates

- unit: autosave 状态机与 flush 行为。
- integration: Zen 打开/编辑/保存链路一致性。
- ui: typography token 快照一致性。
