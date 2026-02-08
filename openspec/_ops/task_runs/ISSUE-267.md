# ISSUE-267

- Issue: #267
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/267
- Branch: `task/267-ipc-partial-closeout`
- PR: `TBD`
- Scope: 关闭 IPC 审计中 2 个“部分实现”（envelope 文档收敛 + preload 暴露安全证据）
- Out of Scope: `#264`、非 IPC 业务改造、command-palette/export E2E 稳定性修复

## Goal

- 将 IPC 审计结论从 `30/2/0` 收敛为 `32/0/0`。
- 不改变生产接口行为（继续使用 `ok` envelope）。

## Status

- CURRENT: 代码与文档修复已完成，门禁验证通过，等待 PR 合并。

## Archive Rewrite Rationale

- 该任务按 owner 明确指令，直接回改以下 archived spec 文本（仅 envelope 文案从 `success` 对齐为 `ok`，不改运行时代码）：
  - `openspec/changes/archive/ipc-p0-runtime-validation-and-error-envelope/specs/ipc/spec.md`
  - `openspec/changes/archive/ipc-p0-preload-gateway-and-security-baseline/specs/ipc/spec.md`
- 该治理例外用于消除历史文档歧义，并与当前主 spec/实现保持一致。

## Decisions Made

- 2026-02-08 采用 `ok` 作为 envelope 规范字段，不引入 `ok/success` 双栈。
- 2026-02-08 S2 证据采用 `E2E + 单测` 双证据。
- 2026-02-08 采用 owner 指令：直接回改 archived spec 文本并在 RUN_LOG 显式记录理由。

## Errors Encountered

- 2026-02-08 在本工作树早期执行 `pnpm test:unit` 时出现 `better-sqlite3` ABI 不匹配（Node 模块编译目标不一致）。
- 处置命令：
  - `env npm_config_runtime=node npm_config_build_from_source=true pnpm -C apps/desktop exec npm rebuild better-sqlite3 --build-from-source --verbose`
- 结果：重建后单测链恢复通过。

## Plan

- 新建 remediation issue/worktree/rulebook task。
- 按 Spec-first 提交 delta spec，再执行 TDD（Red → Green → Refactor）。
- 更新主 spec + 指定 archived spec 的 envelope 文案为 `ok`。
- 新增 preload 暴露安全自动化证据（unit + e2e）。
- 跑完整验证并更新 ISSUE-265/ISSUE-267 证据，完成 PR 自动合并与归档。

## Delta Closeout

| Item | Previous | Now | Evidence |
| --- | --- | --- | --- |
| Envelope 文档字段统一（S1） | 部分实现 | 已实现 | `openspec/specs/ipc/spec.md`; `openspec/changes/archive/ipc-p0-runtime-validation-and-error-envelope/specs/ipc/spec.md`; `openspec/changes/archive/ipc-p0-preload-gateway-and-security-baseline/specs/ipc/spec.md`; `apps/desktop/tests/unit/ipc-spec-envelope-wording.spec.ts` |
| Preload 安全自动化证据（S2） | 部分实现 | 已实现 | `apps/desktop/tests/unit/ipc-preload-exposure-security.spec.ts`; `apps/desktop/tests/e2e/app-launch.spec.ts` |

## Gate Summary

- `pnpm lint`: PASS（0 error / 4 既有 warning）
- `pnpm typecheck`: PASS
- `pnpm test:unit`: PASS（含新单测）
- `pnpm -C apps/desktop test:run`: PASS（62 files / 1225 tests）
- `pnpm contract:check`: PASS
- `env -u ELECTRON_RUN_AS_NODE pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts tests/e2e/app-launch.spec.ts --workers=1`: PASS（2/2）

## Runs

### 2026-02-08 12:13 +0800 issue bootstrap

- Command:
  - `gh issue create --title "[IPC] close partial implementations: envelope+preload-security-evidence" --body "..."`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/267`

### 2026-02-08 12:14 +0800 worktree setup

- Command:
  - `scripts/agent_worktree_setup.sh 267 ipc-partial-closeout`
- Key output:
  - `Worktree created: .worktrees/issue-267-ipc-partial-closeout`
  - `Branch: task/267-ipc-partial-closeout`

### 2026-02-08 12:15 +0800 rulebook task bootstrap

- Command:
  - `rulebook task create issue-267-ipc-partial-closeout`
  - `rulebook task validate issue-267-ipc-partial-closeout`
- Key output:
  - `Task ... created successfully`
  - `Task ... is valid`

### 2026-02-08 12:16 +0800 baseline freeze

- Command:
  - `git rev-parse HEAD`
  - `date '+%Y-%m-%d %H:%M %z'`
  - `printenv ELECTRON_RUN_AS_NODE`
- Key output:
  - `87beca9fb94e69c479bdf8096e347a66cdc491c8`
  - `2026-02-08 12:49 +0800`
  - `1`（本机默认存在，E2E 需 `env -u ELECTRON_RUN_AS_NODE`）

### 2026-02-08 12:17 +0800 dependency bootstrap

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
  - `Already up to date`

### 2026-02-08 12:30 +0800 Red evidence（基线缺口探针）

- Command:
  - `git show origin/main:openspec/specs/ipc/spec.md | rg -n "\\{\\s*success:\\s*(true|false)\\b"`
- Exit code: `0`
- Key output:
  - 命中多处 `success` envelope 示例（line 114/134/141/252/259/277/278/302/309/385/392）。
- Command:
  - `git show origin/main:apps/desktop/tests/e2e/app-launch.spec.ts | rg -n "security: renderer cannot access ipcRenderer/require while bridge remains available"`
- Exit code: `1`
- Key output:
  - 未命中新 security E2E case（基线缺证据）。
- Command:
  - `git ls-tree -r --name-only origin/main | rg "apps/desktop/tests/unit/ipc-(preload-exposure-security|spec-envelope-wording)\\.spec\\.ts"`
- Exit code: `1`
- Key output:
  - 基线不存在两条新单测文件。

### 2026-02-08 12:36 +0800 Green implementation

- Command:
  - `edit openspec/specs/ipc/spec.md`
  - `edit openspec/changes/archive/ipc-p0-runtime-validation-and-error-envelope/specs/ipc/spec.md`
  - `edit openspec/changes/archive/ipc-p0-preload-gateway-and-security-baseline/specs/ipc/spec.md`
  - `add apps/desktop/tests/unit/ipc-spec-envelope-wording.spec.ts`
  - `add apps/desktop/tests/unit/ipc-preload-exposure-security.spec.ts`
  - `edit apps/desktop/tests/e2e/app-launch.spec.ts`
  - `edit package.json`
  - `add openspec/changes/ipc-p0-envelope-ok-and-preload-security-evidence/*`
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Key output:
  - S1 文档字段统一为 `ok`（主 spec + 指定 archived spec）。
  - S2 自动化证据补齐（unit + E2E）。
  - `test:unit` 命令链纳入新增单测。

### 2026-02-08 12:47 +0800 verification gates

- Command:
  - `pnpm lint`
- Exit code: `0`
- Key output:
  - `✖ 4 problems (0 errors, 4 warnings)`（既有 warning）
- Command:
  - `pnpm typecheck`
- Exit code: `0`
- Key output:
  - `tsc --noEmit` pass
- Command:
  - `pnpm test:unit`
- Exit code: `0`
- Key output:
  - `ipc-preload-exposure-security.spec.ts: all assertions passed`
  - `ipc-spec-envelope-wording.spec.ts: all assertions passed`
- Command:
  - `pnpm -C apps/desktop test:run`
- Exit code: `0`
- Key output:
  - `Test Files 62 passed`
  - `Tests 1225 passed`
- Command:
  - `pnpm contract:check`
- Exit code: `0`
- Key output:
  - `pnpm contract:generate && git diff --exit-code ...` pass
- Command:
  - `env -u ELECTRON_RUN_AS_NODE pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts tests/e2e/app-launch.spec.ts --workers=1`
- Exit code: `0`
- Key output:
  - `Running 2 tests using 1 worker`
  - `2 passed (2.4s)`

### 2026-02-08 12:49 +0800 rulebook re-validation

- Command:
  - `rulebook task validate issue-267-ipc-partial-closeout`
- Exit code: `0`
- Key output:
  - `Task issue-267-ipc-partial-closeout is valid`
  - Warning: `No spec files found (specs/*/spec.md)`
