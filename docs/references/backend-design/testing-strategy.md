> 本文件是 backend-design 的一部分，完整索引见 [docs/references/backend-design/README.md](README.md)

# 一、测试策略

Agent 写的代码必须自带测试。CI 通过 `spec-test-mapping gate` 检查变更的 Spec 文件是否有对应 Scenario 测试映射；分支保护规则要求 CI 全绿才可合并。

## 1.1 测试分层

| 层级 | 范围 | 工具 | 运行时机 | 覆盖率要求 |
| --- | --- | --- | --- | --- |
| 单元测试 | 单个函数/类，纯逻辑 | Vitest | L1 pre-commit(--changed)（目标行为） + L2 CI(全量) | >= 70% 行覆盖（CI 门禁：lines 70, branches 55, functions 70, statements 70） |
| 集成测试 | 跨模块交互、IPC 契约、DB 读写 | Vitest + better-sqlite3 内存 DB | L2 CI | 关键路径 100% |
| 契约测试 | IPC 类型安全、入参/出参 Schema | contract:check 自动生成 | L2 CI | 100%（自动） |
| E2E 测试 | 关键用户流程（创建项目 -> 写作 -> 保存） | Playwright / Electron testing | L3 发布前 | Top 5 流程 |

> **实现状态**：单元 / 集成 / 契约测试已在 CI 中运行（`.github/workflows/ci.yml`）。E2E 测试属于 L3 远景，尚未实现。覆盖率门禁已通过 `pnpm -C apps/desktop test:coverage:core` 强制执行。

## 1.2 测试原则

- 新功能必须带测试：PR 变更的 `.spec.md` 文件必须有对应 Scenario 测试映射（CI `spec-test-mapping gate` 验证 Spec Scenario 覆盖；注意该门禁仅扫描变更的 spec 文件，不检查实现文件是否有对应测试）
- Bug 修复必须先写回归测试：先写失败测试再修复，确保不会复发
- Mock 原则：只 Mock 外部依赖（LLM API、文件系统），禁止 Mock 内部 Service（用真实实例 + 内存 SQLite）
- 测试命名：`describe('<模块名>') > it('should <行为> when <条件>')`
- 快照测试：对 LLM prompt 模板、IPC 契约使用快照，变更时必须人工确认

> **已实现位置**：spec-test-mapping gate 由 `pnpm gate:spec-test-mapping` 运行（`scripts/` 下对应脚本）；Stub 检测由 `scripts/service-stub-detector-gate.ts` 执行。

## 1.3 Skill 测试模板

每个新 Skill 必须覆盖：

```
[x] 正常路径（输入合法 -> 预期输出）
[x] 权限拦截（写操作未经 Permission Gate -> 拒绝）
[x] 并发安全（isConcurrencySafe 标记与实际行为一致）
[x] 中断恢复（AbortController 取消 -> 生成合成错误，INV-10）
[x] 成本记录（执行后 costTracker 有记录，INV-9）
[x] Hook 触发（写操作完成后 postWritingHooks 被调用，INV-8）
```

> **已实现位置**：Skill 执行入口为 `apps/desktop/main/src/services/skills/orchestrator.ts`，成本追踪为 `services/ai/costTracker.ts`，Skill 定义与加载为 `services/skills/skillLoader.ts` / `skillService.ts`。测试示例见 `services/skills/__tests__/`。
