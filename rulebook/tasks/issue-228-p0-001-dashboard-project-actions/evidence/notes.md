# Notes

## Scope lock

- 仅交付 P0-001（Dashboard project actions closure）与其必要契约/测试修复。
- 不混入 P1/P2 重构。

## Contract decision

- `project:list` request 使用 `includeArchived?: boolean`。
- `archivedAt` 在 IPC 层为可选 `number`：未归档时字段缺省，避免 `null` schema 扩展。

## Duplicate MVP boundary

- 复制 documents。
- best-effort 复制 `.creonow`。
- 不复制 `document_versions`。

## Validation summary

- Pass: `pnpm typecheck`
- Pass: `pnpm lint`（warnings only）
- Pass: `pnpm contract:check`
- Pass: `pnpm test:unit`
- Pass: `pnpm test:integration`
- Pass: `pnpm -C apps/desktop test:run`
- Blocked: `pnpm -C apps/desktop test:e2e -- tests/e2e/dashboard-project-actions.spec.ts tests/e2e/version-history.spec.ts`
  - root cause: Electron launch fails with `bad option: --remote-debugging-port=0`
