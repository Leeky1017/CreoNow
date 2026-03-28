# 测试命令速查表

> **前置阅读**：`AGENTS.md`（必读）→ `testing-guide.md` → 本文档
> **用途**：本地验证和 CI 对照的命令速查。
> **何时阅读**：运行测试、排查 CI 失败时。

---

## 一、本地测试命令

### 核心命令

| 用途 | 命令 | 说明 |
|------|------|------|
| 单元/集成测试（全量） | `pnpm -C apps/desktop vitest run` | 运行所有测试 |
| 单元/集成测试（匹配） | `pnpm -C apps/desktop vitest run <pattern>` | 按文件名匹配 |
| 单元/集成测试（watch） | `pnpm -C apps/desktop vitest <pattern>` | 开发时持续运行 |
| 类型检查 | `pnpm typecheck` | TypeScript strict 编译 |
| Lint | `pnpm lint` | ESLint（含自定义规则） |
| Storybook 构建 | `pnpm -C apps/desktop storybook:build` | 前端必验 |
| Storybook 本地 | `pnpm -C apps/desktop storybook` | 预览开发 |
| 格式检查 | `pnpm format:check` | Prettier 格式 |

### 高级命令

| 用途 | 命令 |
|------|------|
| 只跑 renderer 测试 | `pnpm -C apps/desktop vitest run --config vitest.config.ts <pattern>` |
| 只跑 core（main+preload）测试 | `pnpm -C apps/desktop vitest run --config vitest.config.core.ts <pattern>` |
| 运行单个测试文件 | `pnpm -C apps/desktop vitest run path/to/file.test.ts` |
| 测试覆盖率 | `pnpm -C apps/desktop vitest run --coverage` |

---

## 二、CI Job 映射表

| CI Job 名称 | 对应本地命令 | 说明 |
|-------------|-------------|------|
| `lint-and-typecheck` | `pnpm lint && pnpm typecheck` | Lint + 类型检查 |
| `unit-test-core` | `pnpm -C apps/desktop vitest run --config vitest.config.core.ts` | 主进程/preload 测试 |
| `unit-test-renderer` | `pnpm -C apps/desktop vitest run --config vitest.config.ts` | 渲染进程测试 |
| `integration-test` | `pnpm -C apps/desktop vitest run --config vitest.config.core.ts *.integration.*` | 集成测试 |
| `test-discovery-consistency` | `pnpm -C apps/desktop tsx scripts/test-discovery-consistency-gate.ts` | 测试发现一致性 |
| `coverage-gate` | `pnpm -C apps/desktop vitest run --coverage` | 覆盖率门禁 |
| `cross-module-check` | `pnpm -C apps/desktop tsx scripts/cross-module-contract-gate.ts` | 跨模块契约 |
| `storybook-build` | `pnpm -C apps/desktop storybook:build` | Storybook 构建 |
| `format-check` | `pnpm format:check` | 格式检查 |

---

## 三、Guard / 门禁脚本

| 门禁 | 脚本路径 | 用途 |
|------|---------|------|
| Spec-Test 映射 | `scripts/spec-test-mapping-gate.ts` | Spec Scenario 必须有对应测试 |
| 架构健康 | `scripts/architecture-health-gate.ts` | God Object / 分层违规检测 |
| IPC 校验 | `scripts/ipc-handler-validation-gate.ts` | IPC handler 注册校验 |
| 包大小 | `scripts/bundle-size-budget.ts` | Bundle size 预算 |
| 资源大小 | `scripts/resource-size-gate.ts` | 单文件资源大小限制 |
| Service Stub | `scripts/service-stub-detector-gate.ts` | 检测未实现的 stub |
| Lint Ratchet | `scripts/lint-ratchet.ts` | Lint 警告只减不增 |
| 错误边界覆盖 | `scripts/error-boundary-coverage-gate.ts` | ErrorBoundary 覆盖率 |

---

## 四、常见 CI 失败排查

| 失败现象 | 排查步骤 |
|---------|---------|
| `lint-and-typecheck` 失败 | 本地 `pnpm lint && pnpm typecheck`；注意自定义 ESLint 规则 |
| `unit-test-*` 失败 | 本地跑对应 vitest config；检查 mock 是否完整 |
| `storybook-build` 失败 | 本地 `pnpm -C apps/desktop storybook:build`；通常是 import 错误 |
| `test-discovery-consistency` 失败 | 检查新测试文件是否被 vitest config 发现 |
| `spec-test-mapping` 失败 | 检查 spec.md 中新增 Scenario 是否有对应 `.test.ts` |
| `cross-module-contract` 失败 | 检查是否修改了模块间接口；运行 `contract-generate.ts` 更新 baseline |
| `format-check` 失败 | `pnpm format` 自动修复后提交 |

---

## 五、PR 提交前本地验证（最小集）

```bash
# 必须全部通过后再推送
pnpm lint                                    # Lint
pnpm typecheck                               # 类型
pnpm -C apps/desktop vitest run <changed>    # 相关测试
pnpm -C apps/desktop storybook:build         # 前端任务必验
pnpm format:check                            # 格式
```

---

## 六、审计命令（分层）

| 层级 | 命令 | 适用场景 |
|------|------|---------|
| Tier L | `scripts/review-audit.sh L [base-ref]` | 低风险、隔离变更 |
| Tier S | `scripts/review-audit.sh S [base-ref]` | 中风险、单模块 |
| Tier D | `scripts/review-audit.sh D [base-ref]` | 高风险、跨模块 |
