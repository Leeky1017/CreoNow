# ISSUE-182

- Issue: #182
- Branch: task/182-spec-hardening
- PR: <fill-after-created>

## Plan

- 把 `design/07` 中 `project:duplicate` 复制范围从"建议"改为 MUST，并写死统一超时 30s
- 把 `design/06` 和 `P0-003` 中 Settings 默认值具体化
- 把 `P0-005` 中模板路径选择从"推荐"改为 MUST

## Runs

### 2026-02-05 固化"建议"为"必须"

- Command: `StrReplace` on multiple files
- Key changes:
  - `design/07-ipc-interface-spec.md`:
    - 添加统一超时 30s（MUST）
    - `project:rename` name 长度上限 MUST 为 1-80
    - `project:duplicate` 复制范围 MUST 为"项目元数据 + documents + KG"
    - `project:archive` 归档行为 MUST 从默认列表隐藏
    - `version:read` Response MUST 保持与 documents 字段一致
    - compare/diff 分工从 SHOULD 改为 MUST
    - KG Characters 约定从 SHOULD 改为 MUST + 写死 metadataJson schema
    - 模板语义选定路径 A 为 MUST
  - `task_cards/p0/P0-003`:
    - Settings 默认值写死（theme/proxyEnabled/proxyUrl/judgeModelEnabled/analyticsEnabled）
  - `task_cards/p0/P0-005`:
    - 模板路径选择固化为路径 A（MUST）
  - `design/06-asset-completion-checklist.md`:
    - Settings 默认值添加到补齐步骤
- Evidence: See git diff
