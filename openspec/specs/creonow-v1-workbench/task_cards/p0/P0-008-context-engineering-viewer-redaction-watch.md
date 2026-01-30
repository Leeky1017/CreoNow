# P0-008: Context engineering（layers + viewer + redaction + watch `.creonow`）

Status: pending

## Goal

交付 CN 的上下文工程最小闭环：`.creonow` 目录 ensure/watch、四层上下文（rules/settings/retrieved/immediate）、token budget 与裁剪证据、redaction（脱敏）与 context viewer 可视化；并提供 `stablePrefixHash` 验收口径与 Windows E2E 断言点。

## Dependencies

- Spec: `../spec.md#cnwb-req-060`
- Design: `../design/04-context-engineering.md`
- Design: `../design/03-ipc-contract-and-errors.md`（错误码/Envelope）
- P0-002: `./P0-002-ipc-contract-ssot-and-codegen.md`
- P0-004: `./P0-004-sqlite-bootstrap-migrations-logs.md`
- P0-006: `./P0-006-ai-runtime-fake-provider-stream-cancel-timeout.md`（触发 context 组装与 viewer）

## Expected File Changes

| 操作   | 文件路径                                                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Add    | `apps/desktop/main/src/ipc/context.ts`（`context:creonow:*` handlers）                                                           |
| Add    | `apps/desktop/main/src/services/context/contextFs.ts`（`.creonow` ensure/read/list）                                             |
| Add    | `apps/desktop/main/src/services/context/watchService.ts`（watch start/stop + errors[]）                                          |
| Add    | `apps/desktop/renderer/src/lib/ai/contextAssembler.ts`（stable systemPrompt + dynamic userContent；deterministic serialization） |
| Add    | `apps/desktop/renderer/src/lib/redaction/redact.ts`（pattern rules + evidence）                                                  |
| Add    | `apps/desktop/renderer/src/features/ai/ContextViewer.tsx`（`data-testid="ai-context-panel"`）                                    |
| Update | `apps/desktop/renderer/src/features/ai/AiPanel.tsx`（context toggle + viewer）                                                   |
| Add    | `apps/desktop/renderer/src/stores/contextStore.ts`（layers/tokenStats/evidence/hashes）                                          |
| Add    | `apps/desktop/tests/e2e/context-viewer-redaction.spec.ts`                                                                        |

## Acceptance Criteria

- [ ] `.creonow` 目录语义与 IPC：
  - [ ] `context:creonow:ensure` 创建并返回 project rootPath
  - [ ] `context:creonow:watch:start/stop` 可控且幂等
  - [ ] rules/settings 可 list/read/get（最小集合）
- [ ] 四层上下文可视化：
  - [ ] viewer 展示 `rules/settings/retrieved/immediate` 四层（稳定选择器见下）
  - [ ] viewer 展示 token 估算与裁剪证据（TrimEvidence）
  - [ ] viewer 展示 redaction evidence
  - [ ] viewer 展示 `stablePrefixHash` 与 `promptHash`
- [ ] stablePrefixHash 验收：
  - [ ] 仅改变选区/指令/检索结果 → `stablePrefixHash` 不变
  - [ ] 改变 rules/settings → `stablePrefixHash` 改变且可解释
- [ ] redaction（脱敏）：
  - [ ] `.creonow/**` 内容命中敏感规则时：viewer/log/prompt 注入均必须替换为 `***REDACTED***`
  - [ ] 禁止在 viewer/log 中出现原始 token/绝对路径
- [ ] 稳定选择器（至少）：
  - [ ] `ai-context-toggle`, `ai-context-panel`
  - [ ] `ai-context-layer-rules/settings/retrieved/immediate`
  - [ ] `ai-context-trim`

## Tests

- [ ] E2E（Windows）`context-viewer-redaction.spec.ts`
  - [ ] 创建项目 → `context:creonow:ensure` → `watch:start`
  - [ ] 写入 `.creonow/rules/style.md`（包含 `sk-THIS_SHOULD_BE_REDACTED`）
  - [ ] 写入超大 `.creonow/settings/世界观.md`（触发裁剪证据）
  - [ ] 运行一个 builtin skill（fake AI）
  - [ ] 打开 context viewer：
    - [ ] 断言四层存在
    - [ ] 断言出现 `***REDACTED***` 且不包含原始 token
    - [ ] 断言存在裁剪证据 UI
    - [ ] 断言路径引用为 `.creonow/...`（非绝对路径）

## Edge cases & Failure modes

- settings 文件无法读取/编码错误 → 必须进入 TrimEvidence（reason=read_error/invalid_format），不得 silent drop
- watch 启动失败（权限/路径问题）→ `IO_ERROR` 且可诊断
- token 估算超预算 → 必须裁剪并留下证据（不得直接丢弃无记录）

## Observability

- `main.log` 必须记录：
  - `context_ensure`（projectId/rootPath）
  - `context_watch_started/stopped`（projectId）
  - `context_watch_error`（error.code）
  - `context_redaction_applied`（patternId/matchCount，不含明文）
