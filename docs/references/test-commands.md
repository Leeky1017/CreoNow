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
| IPC 契约检查 | `pnpm contract:check` | IPC 类型定义一致性 |
| Storybook 构建 | `pnpm -C apps/desktop storybook:build` | 前端必验 |
| Storybook 本地 | `pnpm -C apps/desktop storybook` | 预览开发 |

### 高级命令

| 用途 | 命令 |
|------|------|
| 只跑 renderer 测试 | `pnpm -C apps/desktop vitest run --config vitest.config.ts <pattern>` |
| 只跑 core（main+preload）测试 | `pnpm -C apps/desktop vitest run --config vitest.config.core.ts <pattern>` |
| 运行单个测试文件 | `pnpm -C apps/desktop vitest run path/to/file.test.ts` |
| 测试覆盖率 | `pnpm -C apps/desktop vitest run --coverage` |

---

## 二、CI Job 映射表

CI 配置文件 `.github/workflows/ci.yml` 定义一个 `check` job，包含以下步骤：

| CI Step 名称 | 对应本地命令 | 说明 |
|-------------|-------------|------|
| Type check | `pnpm typecheck` | TypeScript strict 编译 |
| IPC contract check | `pnpm contract:check` | IPC 类型定义一致性 |
| Spec-test mapping gate | `pnpm gate:spec-test-mapping` | Spec Scenario 必须有对应测试 |
| Stub gate | `node --import tsx scripts/service-stub-detector-gate.ts` | Service 桩方法检测 |
| Unit tests | `pnpm test:unit` | 主进程/preload 单元测试 |
| Integration tests | `pnpm test:integration` | 集成测试 |
| Renderer tests | `pnpm -C apps/desktop test:renderer` | 渲染进程测试 |
| Desktop core coverage gate | `pnpm -C apps/desktop test:coverage:core` | 覆盖率门禁 |
| Python tests | `pytest -q scripts/tests` | Python 脚本测试 |
| Electron build | `pnpm desktop:build` | Electron 构建 |
| Desktop Storybook build | `pnpm -C apps/desktop storybook:build` | Storybook 构建 |
| Storybook chunk budget gate | `pnpm gate:storybook-budget` | Storybook chunk 体积预算 |
| Upload desktop Storybook artifact | — | 将 Storybook 构建产物上传为 CI artifact |

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
| Type check 失败 | 本地 `pnpm typecheck`；检查 strict mode 类型错误 |
| Unit tests / Integration tests 失败 | 本地跑 `pnpm test:unit` / `pnpm test:integration`；检查 mock 是否完整 |
| Renderer tests 失败 | 本地 `pnpm -C apps/desktop test:renderer`；检查 DOM/component mock |
| Desktop Storybook build 失败 | 本地 `pnpm -C apps/desktop storybook:build`；通常是 import 错误 |
| Spec-test mapping gate 失败 | 检查 spec.md 中新增 Scenario 是否有对应 `.test.ts` |
| IPC contract check 失败 | 运行 `pnpm contract:check`；检查是否修改了 IPC 接口 |
| Stub gate 失败 | 检查是否有未实现的 service 桩方法 |
| Storybook chunk budget gate 失败 | 检查 Storybook 产物体积是否超标 |

---

## 五、PR 提交前本地验证（最小集）

```bash
# 必须全部通过后再推送
pnpm typecheck                               # 类型
pnpm contract:check                          # IPC 契约
pnpm -C apps/desktop vitest run <changed>    # 相关测试
pnpm -C apps/desktop storybook:build         # 前端任务必验
```

---

## 六、审计命令（分层）

| 层级 | 命令 | 适用场景 |
|------|------|---------|
| Tier L | `scripts/review-audit.sh L [base-ref]` | 低风险、隔离变更 |
| Tier S | `scripts/review-audit.sh S [base-ref]` | 中风险、单模块 |
| Tier D | `scripts/review-audit.sh D [base-ref]` | 高风险、跨模块 |
