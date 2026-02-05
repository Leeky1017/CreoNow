# P1-004: API Key 安全存储（keytar 替代 SQLite 明文）

Status: todo

## Goal

把 AI Proxy API Key 从 SQLite settings 明文存储迁移到系统密钥链（keytar），并提供向后迁移与可测试的降级策略。

> 审评报告定位：`apps/desktop/main/src/services/ai/aiProxySettingsService.ts:201` 写入明文 JSON。

## Dependencies

- Spec: `../spec.md#cnmvp-req-006`
- Design: `../design/06-security-hardening.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/package.json`（新增 `keytar` 依赖） |
| Update | `apps/desktop/main/src/services/ai/aiProxySettingsService.ts`（改为 keytar） |
| Add | `apps/desktop/main/src/services/secrets/secretStore.ts`（显式注入：keytar adapter + stub） |
| Update | `apps/desktop/main/src/ipc/aiProxy.ts`（若需要暴露“已配置”语义，保持不泄露 key） |
| Update | `apps/desktop/package.json`（`rebuild:native` 需包含 keytar） |
| Add | `apps/desktop/tests/unit/aiProxySettingsService.keytar.test.ts` |

## Detailed Breakdown（写死实现策略）

1. 引入显式依赖：SecretStore
   - `SecretStore` interface（get/set/delete）
   - 默认实现使用 keytar（service/account 见 Design 06）
   - 单测使用 in-memory stub（不得依赖 keytar 可用性）
2. 改造 `createAiProxySettingsService`
   - 读取 apiKey：从 SecretStore 获取
   - 更新 apiKey：写入 SecretStore
   - SQLite settings 中不再写入明文（写死：删除 key 或写空字符串）
3. 迁移逻辑（必须）
   - 若 SQLite 旧值存在且 SecretStore 为空：迁移并清理 SQLite
4. Electron build
   - 更新 `rebuild:native` 把 keytar 纳入 electron-rebuild
5. 单测
   - 覆盖迁移、读写、keytar 不可用降级（写死：返回 `DB_ERROR` 或 `INTERNAL`，但必须 deterministic）

## Acceptance Criteria

- [ ] SQLite settings 中不再存在可恢复的 apiKey 明文
- [ ] 旧值可自动迁移到 keytar（且迁移后清理旧值）
- [ ] renderer/UI 仍能正确显示 `apiKeyConfigured`
- [ ] 单测覆盖 keytar stub 与迁移逻辑

## Tests

- [ ] `pnpm test:unit`

## Edge cases

- keytar 不可用（CI/Linux）：必须有 deterministic 行为（不能 silent failure）
- 日志脱敏：任何日志不得包含 apiKey 明文

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

