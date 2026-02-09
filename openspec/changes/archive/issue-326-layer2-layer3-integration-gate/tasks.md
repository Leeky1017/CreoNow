## 1. Specification

- [x] 1.1 审阅并确认 Layer2/Layer3 里程碑集成检查边界（本 change 仅做检查与落盘，不改运行时代码）
- [x] 1.2 审阅并确认跨模块接口差异分类口径（Implemented / Partial / Missing）
- [x] 1.3 审阅并确认验收门禁（全量测试、契约核对、delta report）
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A（本 change 无上游活跃依赖，N/A）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例或检查命令
- [x] 2.2 为每个测试/检查标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现；未出现 Red（失败证据）不得进入文档结论

### Scenario → Test/Check 映射

- [x] L23-G1 `全量门禁结果被记录 [ADDED]`
  - 命令：`pnpm lint`、`pnpm typecheck`、`pnpm test:unit`、`pnpm -C apps/desktop test:run`、`pnpm test:integration`、`pnpm test:ipc:acceptance`、`pnpm contract:check`、`pnpm -C apps/desktop storybook:build`、`pnpm desktop:test:e2e`
- [x] L23-G2 `跨模块契约漂移被显式标注 [ADDED]`
  - 检查：`rg` 对比 `openspec/specs/cross-module-integration-spec.md` 与 `ipc-contract.ts` / `ipc-generated.ts`
- [x] L23-G3 `未收敛项必须有后续动作 [ADDED]`
  - 产物：`openspec/changes/issue-326-layer2-layer3-integration-gate/delta-report.md`
- [x] L23-B1 `当前对齐基线被锁定 [ADDED]`
  - 证据测试：
    - `apps/desktop/tests/integration/memory/trace-get-display.test.ts`
    - `apps/desktop/tests/integration/memory/trace-feedback.test.ts`
    - `apps/desktop/tests/integration/kg/query-cycle-timeout.test.ts`
    - `apps/desktop/tests/integration/kg/query-cross-project-guard.test.ts`
    - `apps/desktop/tests/integration/project-switch.autosave.test.ts`
    - `apps/desktop/tests/unit/contract-generate.validation.spec.ts`

## 3. Red（先写失败测试）

- [x] 3.1 运行契约对比检查，确认 `skill:execute`/`skill:stream:*`/`ai:chat:send` 与实现不一致（Red）
- [x] 3.2 运行命名检查，确认 `knowledge:query:byIds` 与实现 `knowledge:query:byids` 存在大小写漂移（Red）
- [x] 3.3 运行响应结构检查，确认规范 `success` 与实现 `ok` 不一致（Red）

## 4. Green（最小实现通过）

- [x] 4.1 新增 delta spec，定义里程碑集成检查与对齐基线要求
- [x] 4.2 新增 delta report，逐条标注 Implemented / Partial / Missing 与 follow-up
- [x] 4.3 补全 RUN_LOG 与 Rulebook task，形成可审计闭环

## 5. Refactor（保持绿灯）

- [x] 5.1 统一术语（Layer2/Layer3、channel naming、envelope、error baseline）
- [x] 5.2 收敛证据引用路径，避免重复和歧义

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含全量测试结果、Red 差异证据、Green 文档产物）
- [x] 6.2 记录 Dependency Sync Check 结论（N/A，无上游活跃依赖）
- [ ] 6.3 等待 PR required checks 全绿后执行 change 归档
