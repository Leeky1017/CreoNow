# ISSUE-526

- Issue: #526
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/526
- Branch: task/526-sprint0-group-a-c-delivery
- PR: pending
- Scope: 实现并交付 Sprint0 并行组 A + 并行组 C（共 6 个 change）
- Out of Scope: 串行组 B（`s0-metadata-failfast`、`s0-kg-async-validate`）

## Plan

- [x] 建立 OPEN Issue、隔离 worktree 与 Rulebook task
- [x] 并行派发子代理完成 6 个 change 的 Red→Green 实现
- [x] 主会话集成 6 个提交并执行缺陷优先审计
- [x] 修复主会话审计发现的问题并复验
- [ ] preflight / PR / auto-merge / main sync / cleanup 收口

## Runs

### 2026-02-14 12:31 准入与环境隔离

- Command:
  - `gh issue create --repo Leeky1017/CreoNow --title "Implement Sprint0 parallel group A+C changes with governed delivery" ...`
  - `scripts/agent_worktree_setup.sh 526 sprint0-group-a-c-delivery`
  - `pnpm install --frozen-lockfile`
  - `rulebook task create issue-526-sprint0-group-a-c-delivery`
  - `rulebook task validate issue-526-sprint0-group-a-c-delivery`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`#526`
  - worktree：`.worktrees/issue-526-sprint0-group-a-c-delivery`
  - 分支：`task/526-sprint0-group-a-c-delivery`

### 2026-02-14 12:33 并行子代理派发（6 个 change）

- Subagent branches/worktrees:
  - `task/526-s0-fake-queued-fix` → `.worktrees/issue-526-s0-fake-queued-fix`
  - `task/526-s0-window-load-catch` → `.worktrees/issue-526-s0-window-load-catch`
  - `task/526-s0-app-ready-catch` → `.worktrees/issue-526-s0-app-ready-catch`
  - `task/526-s0-skill-loader-error` → `.worktrees/issue-526-s0-skill-loader-error`
  - `task/526-s0-sandbox-enable` → `.worktrees/issue-526-s0-sandbox-enable`
  - `task/526-s0-context-observe` → `.worktrees/issue-526-s0-context-observe`
- Subagent commit outputs:
  - `bc4623c8655e988c4521d9015c9336584c6d6080` (`s0-fake-queued-fix`)
  - `a49edc8ce11eef3a8c29dae7329c670ccf96b955` (`s0-window-load-catch`)
  - `1cd09ae88fe84b6cc66595ba14b09e06fa3dc622` (`s0-app-ready-catch`)
  - `0456c588f82e96652016b6b98f613165ab5f1097` (`s0-skill-loader-error`)
  - `9b33de500c857e0767c391b03d6b8783bf717c28` (`s0-sandbox-enable`)
  - `730f9a087b1bfd54302dd002cd17521f0b3d690b` (`s0-context-observe`)

### 2026-02-14 12:42 主会话集成与冲突处理

- Command:
  - `git cherry-pick <6 SHAs>`
- Exit code: `1`（中途冲突）→ `0`（解决后继续）
- Conflict handling:
  - `apps/desktop/main/src/index.ts` 在 `s0-window-load-catch` / `s0-app-ready-catch` / `s0-sandbox-enable` 间发生冲突
  - 主会话合并策略：保留三者语义同时成立（`window_load_failed`、`app_init_fatal`、`sandbox:true` + E2E query 注入）

### 2026-02-14 12:54 主会话审计发现并修复（缺陷优先）

- Finding F1（阻断级）：IPC contract 使用 `s.null()` 但 schema DSL 不支持，导致测试崩溃
  - Symptom: `TypeError: s.null is not a function`
  - Fix:
    - `apps/desktop/main/src/ipc/contract/ipc-contract.ts` 改为 `s.literal(null)`
    - `apps/desktop/main/src/ipc/contract/schema.ts` 增补 literal null 类型支持
    - `scripts/contract-generate.ts` 同步支持 null literal
- Finding F2（高）：`window-load` 单测断言与 URL 归一化行为不一致（`/` 尾斜杠）
  - Fix: `index.ts` 在非 E2E 场景保留原始 dev URL，仅 E2E 才注入 query 参数
- Finding F3（高）：新增主链测试未纳入统一配置，导致验证遗漏
  - Fix: `apps/desktop/tests/unit/main/vitest.window-load.config.ts` 扩展为 `tests/unit/main/*.test.ts`
- Finding F4（中）：`index.app-ready-catch` 成功路径测试误触发失败
  - Fix: 测试 mock `loadURL/loadFile` 返回 Promise.resolve，避免被 `window_load_failed` 分支干扰
- Finding F5（中）：E2E 类型与导入路径类型错误导致 `typecheck` 失败
  - Fix:
    - `apps/desktop/tests/e2e/app-launch.spec.ts` 对 `webContents` 使用类型收窄
    - `apps/desktop/tests/unit/main/window-load-catch.test.ts` 去掉 `.ts` 扩展动态导入

### 2026-02-14 12:56 验证回归（Fresh Evidence）

- Command:
  - `pnpm -C apps/desktop exec vitest run --config tests/unit/main/vitest.window-load.config.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/kg/recognition-empty-content-skip.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/kg/recognition-silent-degrade.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/skillLoader.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/skillValidator.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/skill-executor.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ipc-browser-window-sandbox-security.spec.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ipc-preload-exposure-security.spec.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ipc-preload-security.spec.ts`
  - `pnpm contract:check`
  - `pnpm typecheck`
  - `pnpm -C apps/desktop build`
  - `pnpm -C apps/desktop exec playwright test tests/e2e/app-launch.spec.ts -c tests/e2e/playwright.config.ts`
- Exit code: `0`
- Key output:
  - vitest（main 启动链路）`2 passed files, 6 passed tests`
  - app-launch E2E `2 passed`
  - `contract:check` / `typecheck` 通过

## Main Session Audit

- Audit-Owner: main-session
- Reviewed-HEAD-SHA: pending
- Spec-Compliance: PASS
- Code-Quality: PASS
- Fresh-Verification: PASS
- Blocking-Issues: 0
- Decision: ACCEPT
