# P1-001: Light Theme（不进入 V1 关键路径）

Status: pending

## Goal

在不影响 V1 深色主题交付的前提下，按 `design/DESIGN_DECISIONS.md` 补齐浅色主题 tokens 与主题切换（无闪烁、可持久化、可跟随系统）。

## Dependencies

- Spec: `../spec.md`（Non-goals：浅色主题不作为 P0）
- Design: `../../../design/DESIGN_DECISIONS.md`（主题与 tokens 规范）
- P0-003: `../p0/P0-003-renderer-design-tokens-appshell-resizer-preferences.md`

## Expected File Changes

| 操作   | 文件路径                                                                 |
| ------ | ------------------------------------------------------------------------ |
| Update | `apps/desktop/renderer/src/styles/tokens.css`（补齐 light tokens）       |
| Add    | `apps/desktop/renderer/src/stores/themeStore.ts`（`creonow.theme.mode`） |
| Update | `apps/desktop/renderer/src/features/settings/AppearanceSection.tsx`      |
| Add    | `apps/desktop/tests/e2e/theme.spec.ts`                                   |

## Acceptance Criteria

- [ ] 支持 `data-theme="light"` 并完整覆盖 tokens（禁止硬编码色值）
- [ ] 主题切换无闪烁（避免首屏 FOUC）
- [ ] 主题偏好持久化（PreferenceStore）
- [ ] 支持跟随系统主题（可选，但若实现必须可测）

## Tests

- [ ] E2E（Windows）：
  - [ ] 切换到 light → 断言 `<html data-theme="light">`
  - [ ] 重启 → 主题保持

## Edge cases & Failure modes

- tokens 缺失导致 UI 不可读 → 必须在验收清单中逐项对齐

## Observability

- renderer 日志（可选）：记录主题变更（不含用户隐私）
