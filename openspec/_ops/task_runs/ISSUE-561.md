# ISSUE-561

- Issue: #561
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/561
- Branch: `task/561-s3-i18n-setup`
- PR: `N/A`（按任务约束：No PR creation）
- Scope:
  - `apps/desktop/renderer/src/i18n/**`
  - `apps/desktop/renderer/src/main.tsx`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `apps/desktop/renderer/src/__tests__/app-shell-i18n-bootstrap.test.tsx`
  - `rulebook/tasks/issue-561-s3-i18n-setup/**`
  - `openspec/changes/s3-i18n-setup/tasks.md`
  - `openspec/_ops/task_runs/ISSUE-561.md`
- Out of Scope:
  - 全量文案抽取与替换（`s3-i18n-extract`）
  - 语言切换 UI / 用户偏好持久化
  - PR、auto-merge、main 收口

## Plan

- [x] 阅读 AGENTS/OpenSpec/Delivery/Workbench spec 与 `s3-i18n-setup` change 文件
- [x] 完成严格 TDD（S1/S2/S3：Red → Green）
- [x] 增加 i18n init + `zh-CN/en` locale skeleton + App shell key-render path
- [x] 创建并更新 Rulebook task，完成 validate
- [x] 更新 `openspec/changes/s3-i18n-setup/tasks.md` 勾选
- [x] 运行聚焦测试并落盘证据
- [ ] PR + auto-merge + main sync（按任务约束不执行）

## Runs

### 2026-02-15 10:00-10:03 文档读取与任务准入

- Command:
  - `sed -n '1,260p' AGENTS.md`
  - `sed -n '1,260p' openspec/project.md`
  - `sed -n '1,320p' docs/delivery-skill.md`
  - `sed -n '1,320p' openspec/specs/workbench/spec.md`
  - `find openspec/changes/s3-i18n-setup -maxdepth 4 -type f | sort`
  - `sed -n '1,320p' openspec/changes/s3-i18n-setup/{proposal.md,tasks.md}`
- Exit code: `0`
- Key output:
  - 已确认任务范围仅限 i18n 初始化基线与 App shell key 渲染入口。
  - 已确认 Scenario 映射：S1/S2/S3。

### 2026-02-15 10:03 Red：先写失败测试并执行

- Command:
  - `pnpm --filter @creonow/desktop exec vitest run renderer/src/i18n/__tests__/i18n-setup.test.ts renderer/src/__tests__/app-shell-i18n-bootstrap.test.tsx`
- Exit code: `1`
- Key output:
  - `Failed to resolve import "../index"`（`i18n/index.ts` 尚不存在）
  - `Failed to resolve import "../i18n"`（bootstrap i18n 入口尚不存在）
  - Red 失败原因与 `s3-i18n-setup` 缺口一致，满足进入 Green 条件。

### 2026-02-15 10:03-10:05 Green：最小实现与依赖接线

- Command:
  - `pnpm --filter @creonow/desktop add i18next react-i18next`
  - 新增/修改实现文件（`i18n/index.ts`、`locales/*.json`、`main.tsx`、`AppShell.tsx`）
  - `pnpm --filter @creonow/desktop exec vitest run renderer/src/i18n/__tests__/i18n-setup.test.ts renderer/src/__tests__/app-shell-i18n-bootstrap.test.tsx`
- Exit code:
  - 首次 Green 验证：`1`（S1 fallback 断言需兼容 i18next 标准化后的数组形态）
  - 修正断言后二次验证：`0`
- Key output:
  - `Test Files  2 passed (2)`
  - `Tests  3 passed (3)`

### 2026-02-15 10:07 Rulebook task 建立与校验

- Command:
  - 创建任务文件：`rulebook/tasks/issue-561-s3-i18n-setup/{.metadata.json,proposal.md,tasks.md,specs/workbench/spec.md}`
  - `rulebook task validate issue-561-s3-i18n-setup`
- Exit code: `0`
- Key output:
  - `✅ Task issue-561-s3-i18n-setup is valid`

### 2026-02-15 10:10-10:11 Fresh Verification（提交前复验）

- Command:
  - `rulebook task validate issue-561-s3-i18n-setup`
  - `pnpm --filter @creonow/desktop exec vitest run renderer/src/i18n/__tests__/i18n-setup.test.ts renderer/src/__tests__/app-shell-i18n-bootstrap.test.tsx`
- Exit code: `0`
- Key output:
  - `✅ Task issue-561-s3-i18n-setup is valid`
  - `Test Files  2 passed (2)`
  - `Tests  3 passed (3)`
  - 备注：存在既有 `act(...)` warning（来自 AppShell 相关异步状态更新），不影响本次测试通过与任务范围。

## 依赖同步检查（Dependency Sync Check）

- Inputs:
  - `docs/plans/unified-roadmap.md`（Sprint 3 依赖图）
  - `openspec/specs/workbench/spec.md`
  - `openspec/changes/s3-i18n-setup/{proposal.md,specs/workbench-delta.md,tasks.md}`
- Checkpoints:
  - 本 change 无上游依赖，进入 Red 前无需等待上游产物；
  - 下游 `s3-i18n-extract` 依赖的默认语言、回退语言、key 渲染入口已在本变更提供；
  - 未引入路线图外语言切换 UI/IPC 改动。
- Result: `N/A（无上游依赖）` + `NO_DRIFT（对下游契约）`
- Action: 继续执行 TDD 并完成本轮实现。
