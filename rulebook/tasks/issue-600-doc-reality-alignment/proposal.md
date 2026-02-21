# Proposal: issue-600-doc-reality-alignment

更新时间：2026-02-21 11:57

## Why
CreoNow 当前存在大量会被后续 Agent 当作事实来源的文档，但其中部分内容与代码/门禁真实状态不一致，导致交付失败、返工与治理漂移。

需要一次性做“文档-代码现实对齐”治理，并建立可被 CI 门禁校验的时间戳机制，确保后续文档默认可追溯且不再静默漂移。

## What Changes
- 全量盘点受管文档（README/docs/openspec/rulebook 及审计治理说明），对“事实陈述”逐条对齐代码证据（`path:line`），形成《文档-代码对齐矩阵》并分级（P0/P1/P2）。
- 对 P0/P1 失真点进行最小充分修复：删除过期内容、修正矛盾、补充限定语；必要时重写而非补丁缝合。
- 落地时间戳治理：统一格式 `更新时间：YYYY-MM-DD HH:mm`（标题下方 5 行内）；新增脚本并接入现有 required checks（不新增新的 required check 名称）。
- 明确例外与不可变区：`openspec/changes/archive/**`、`rulebook/tasks/archive/**` 与历史归档文档默认不改，仅在必要处补充“历史归档说明”。

## Impact
- Affected specs: N/A（治理/文档对齐专项，目标不引入产品行为变更）
- Affected code:
  - `scripts/**`（timestamp 校验）
  - `.github/workflows/ci.yml`（把校验接入 required check `ci`）
- Affected docs:
  - `README*.md`
  - `docs/**/*.md`
  - `openspec/{project.md,specs/**,changes/**}`（active；archives 默认不改）
  - `rulebook/tasks/issue-600-doc-reality-alignment/**`
- Breaking change: NO（但新增治理门禁会阻断缺少时间戳的文档变更）
- User benefit: 文档默认可信、可追溯、可验收；后续 Agent 不再被过期文档误导，治理漂移可被门禁阻断。
