# ISSUE-321

- Issue: #321
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/321
- Branch: task/321-knowledge-graph-p2-auto-recognition-ai-utilization
- PR: https://github.com/Leeky1017/CreoNow/pull/323
- Scope: 完成 `knowledge-graph-p2-auto-recognition-ai-utilization` 全部任务（TDD、实现、验证、归档、交付）
- Out of Scope: CE 真实 Rules 注入编排、真实 LLM provider 调用、Memory 联动

## Plan

- 基于 KG3 delta 完成 Scenario→测试映射，先落 Red 失败证据。
- 最小实现 `KgRecognitionRuntime` + KG3 IPC + autosave 异步触发 + Rules mock 注入。
- 更新 contract 与 generated types，新增错误码与通道。
- 跑 unit/integration/typecheck/lint/contract 验证，完成 change 归档与执行顺序文档同步。
- 提交、PR、auto-merge、回收到控制面 `main`。

## Runs

### 2026-02-09 00:57 准入与基础状态

- Command: `git branch --show-current && git status --short`
- Exit code: `0`
- Key output:
  - `task/321-knowledge-graph-p2-auto-recognition-ai-utilization`
  - 已存在 KG3 新增测试与运行时文件的未提交改动。

### 2026-02-09 01:00 Dependency Sync Check（KG2 -> KG3）

- Input checks:
  - 数据结构：`kg_entities`、`kg_relations`、`kg_relation_types` 与 P1/P0 契约一致。
  - IPC 契约：现有 `knowledge:entity/*`、`knowledge:relation/*`、`knowledge:query/*` 通道可复用；KG3 新通道需补充。
  - 错误码基线：已有 `KG_*` 错误码可扩展；需新增识别不可用/相关查询失败/跨项目访问阻断。
  - 阈值基线：并发上限 4、查询退化策略与 mock-only LLM 要求明确。
- Conclusion:
  - 未发现依赖漂移，可进入 Red。

### 2026-02-09 01:07 Red 失败证据（KG3 新场景）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/kg/auto-recognition-autosave.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/kg/kg-rules-injection.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/kg/query-cross-project-guard.test.ts`
- Exit code: `1`
- Key output:
  - `Missing IPC handler: knowledge:recognition:enqueue`
  - `Missing IPC handler: knowledge:rules:inject`
  - `Missing IPC handler: knowledge:query:byIds`（后续按命名治理落地为 `knowledge:query:byids`）

### 2026-02-09 01:20 Green 实现（KG3 主链路）

- Edited:
  - `apps/desktop/main/src/services/kg/kgRecognitionRuntime.ts`（并发=4、排队、取消、会话去重、建议推送/接受/忽略）
  - `apps/desktop/main/src/ipc/knowledgeGraph.ts`（KG3 handlers 全接线）
  - `apps/desktop/main/src/ipc/file.ts`（autosave 成功后异步 enqueue）
  - `apps/desktop/main/src/index.ts`（runtime 单例注入 file + knowledge IPC）
  - `apps/desktop/main/src/services/kg/kgService.ts`（`query:relevant` / `query:byids` / `rules:inject`）
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`（KG3 channels + error codes）
  - `packages/shared/types/ipc-generated.ts`（`pnpm contract:generate` 同步）
  - `package.json`（将 11 个 KG3 测试纳入 `test:unit` / `test:integration`）

### 2026-02-09 01:32 命名治理修正

- Command: `pnpm contract:generate`
- Exit code: `1`（首次）
- Key output:
  - `[IPC_CONTRACT_INVALID_NAME] Channel knowledge:query:byIds must use lowercase ...`
- Action:
  - 统一调整为 `knowledge:query:byids`（contract / IPC / 测试同步）。
- Command: `pnpm contract:generate`
- Exit code: `0`

### 2026-02-09 01:40 Green 通过证据（新增 11 测试）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/kg/auto-recognition-autosave.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/kg/suggestion-accept-create-entity.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/kg/suggestion-dismiss-dedupe.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/kg/recognition-silent-degrade.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/kg/kg-rules-injection.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/kg/kg-rules-undefined-attributes-guard.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/kg/kg-empty-rules-degrade.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/kg/recognition-backpressure.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/kg/recognition-query-failure-degrade.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/kg/recognition-queue-cancel.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/kg/query-cross-project-guard.test.ts`
- Exit code: `0`
- Key output:
  - 11/11 全部通过。

### 2026-02-09 01:48 全量验证

- Command: `pnpm typecheck`
- Exit code: `0`

- Command: `pnpm lint`
- Exit code: `0`
- Key output:
  - 存在仓库既有 `react-hooks/exhaustive-deps` warnings（0 errors）。

- Command: `pnpm test:unit`
- Exit code: `0`

- Command: `pnpm test:integration`
- Exit code: `0`

### 2026-02-09 02:05 OpenSpec 收口

- Command:
  - `git mv openspec/changes/knowledge-graph-p2-auto-recognition-ai-utilization openspec/changes/archive/knowledge-graph-p2-auto-recognition-ai-utilization`
  - 更新 `openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - change 已归档，活跃 change 从 3 降为 2。

### 2026-02-09 02:13 提交、推送与 PR

- Command: `git add -A && git commit -m "feat: deliver kg3 auto recognition and rules injection (#321)"`
- Exit code: `0`
- Key output:
  - `a6fe27db feat: deliver kg3 auto recognition and rules injection (#321)`
  - 29 files changed（代码、测试、contract、OpenSpec 归档、Rulebook、RUN_LOG）。

- Command: `git push -u origin task/321-knowledge-graph-p2-auto-recognition-ai-utilization`
- Exit code: `0`
- Key output:
  - 远端分支创建成功并建立 tracking。

- Command: `gh pr create --base main --head task/321-knowledge-graph-p2-auto-recognition-ai-utilization --title "Deliver KG3 auto recognition and AI utilization (#321)" --body "..."`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/pull/323`

### 2026-02-09 02:14 preflight 占位阻断与回填

- Command: `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `[RUN_LOG] PR field still placeholder ... (待回填)`
- Action:
  - 回填真实 PR 链接 `https://github.com/Leeky1017/CreoNow/pull/323`。
