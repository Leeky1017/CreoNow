# CN Engineering Gates Specification

本文件定义 CN 的三层工程门禁与 Agent 自治流程。核心原则：不符合标准的产物，系统自动拦下，不让它进入主干、不让它发布。已实现的门禁（pre-commit hooks、CI checks）自动执行；部分高层门禁仍在建设中（详见各节标注）。

---

## 一、三层门禁

### L1 -- 本地门禁

- 触发时机：pre-commit / pre-push
- 检查项（当前已实现）：
    - pre-commit：控制面直接提交拦截 + main 分支提交拦截 + creonow-app/src/ 下 `.ts/.tsx` 文件的 lint-staged
    - pre-push：控制面直接推送拦截 + main 分支直接推送拦截
- 检查项（目标行为，尚未实现）：typecheck / 快速单测
- 失败行为：阻止 commit/push
- 实现：`.githooks/`（通过 `scripts/agent_git_hooks_install.sh` 安装）
- 紧急绕过：`CREONOW_ALLOW_CONTROLPLANE_BYPASS=1`

实际 hook 行为：

```bash
# .githooks/pre-commit
# 1. 控制面根目录提交拦截（必须在 worktree 中操作）
# 2. main 分支提交拦截（禁止在 main 上直接提交，建议使用 task/<N>-<slug> 分支）
# 3. creonow-app/src/ 下有 staged .ts/.tsx 文件时运行 lint-staged

# .githooks/pre-push
# 1. 控制面根目录推送拦截
# 2. 禁止直接推送到 refs/heads/main
```

实际 lint-staged 配置（位于 `creonow-app/package.json`）：

```json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --max-warnings 0",
      "prettier --check"
    ]
  }
}
```

### L2 -- PR 门禁

- 触发时机：push to main / PR 创建或更新（CI）
- 检查项（当前已实现）：
    - Type check（`pnpm typecheck`）
    - IPC 契约校验（`pnpm contract:check`）
    - Spec-test mapping gate（`pnpm gate:spec-test-mapping`）
    - Service stub detector gate
    - 单元测试（`pnpm test:unit`）
    - 集成测试（`pnpm test:integration`）
    - Renderer 测试（`pnpm -C apps/desktop test:renderer`）
    - Desktop core coverage gate（`pnpm -C apps/desktop test:coverage:core`）
    - Python 测试（`pytest -q scripts/tests`）
    - Electron 构建（`pnpm desktop:build`）
    - Desktop Storybook 构建 + chunk budget gate
- 检查项（计划实现）：
    - Lint（`pnpm lint`）
    - 依赖方向检查（dependency-cruiser 或自写脚本）
    - Invariant Checklist 解析（INV-1~10 必须填写）
- 失败行为：阻止合并
- 实现：`.github/workflows/ci.yml`

CI Workflow 结构（反映实际 `ci.yml`）：

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm typecheck

      - name: IPC contract check
        run: pnpm contract:check

      - name: Spec-test mapping gate
        run: pnpm gate:spec-test-mapping

      - name: Stub gate
        run: node --import tsx scripts/service-stub-detector-gate.ts

      - name: Unit tests
        run: pnpm test:unit

      - name: Integration tests
        run: pnpm test:integration

      - name: Renderer tests
        run: pnpm -C apps/desktop test:renderer

      - name: Desktop core coverage gate
        run: pnpm -C apps/desktop test:coverage:core

      - uses: actions/setup-python@v5
      - name: Python tests
        run: pytest -q scripts/tests

      - name: Electron build
        run: pnpm desktop:build

      - name: Desktop Storybook build
        run: pnpm -C apps/desktop storybook:build

      - name: Storybook chunk budget gate
        run: pnpm gate:storybook-budget

      - name: Upload desktop Storybook artifact
        uses: actions/upload-artifact@v4
```

### L3 -- 发布门禁（远景，尚未实现）

- 触发时机：合并到 main（CD）
- 检查项：
    - 自动版本号 + Changelog
    - 构建 Electron 产物
    - 灰度发布
    - error rate 检查
- 失败行为：自动回滚
- 优先级：P3（远景）

---

## 二、Agent 自治三阶段

### 阶段 A -- 先设计后编码（强制）

Agent 写代码之前必须先输出：

- 涉及哪些 INV-*
- 模块边界图
- Definition of Done

写入 PR 描述，CI 检查存在性（计划实现，当前由人工审查确认）。

### 阶段 B -- 受约束编码

PR 描述包含 Invariant Checklist（INV-1~10 逐条勾选），CI 自动解析（计划实现），未填写 = 阻止合并。

每条必须声明：

- 遵守：本次改动符合该 INV
- 不涉及：本次改动与该 INV 无关
- 违反（附理由）：明确说明为什么违反以及补救措施

### 阶段 C -- Agent 审 Agent（计划实现，当前由人工 + Agent 协作完成）

合并后触发 Audit Agent（计划自动化）：

- 检查代码是否符合 AGENTS.md Invariant
- 注释是否合规（模块入口注释、阈值注释）
- 测试覆盖率是否达标
- 输出审计报告

---

## 三、流水线全览

```
Agent 接到需求
  -> 阶段 A: 设计文档（INV 声明 + 模块边界 + DoD）
  -> 阶段 B: 编码 + 测试
  -> L1: pre-commit（控制面/main 拦截 + lint-staged）
  -> 推送 -> PR
  -> L2: CI 检查（typecheck + 契约 + 测试 + 构建 + Storybook）
    -> 通过 -> 合并 main
    -> 失败 -> 回到编码
  -> 合并后:
    -> 阶段 C: Audit Agent 审计（计划实现）
    -> L3: 构建 + 灰度（远景）
      -> 正常 -> 全量发布
      -> 异常 -> 自动回滚
```

## 四、门禁配置清单

以下是 Week 0 需要配置的门禁文件：

| 文件 | 路径 | 用途 |
| --- | --- | --- |
| pre-commit hook | `.githooks/pre-commit` | 控制面/main 拦截 + creonow-app lint-staged |
| pre-push hook | `.githooks/pre-push` | 控制面/main 推送拦截 |
| lint-staged 配置 | `creonow-app/package.json` | creonow-app/src/ 下 eslint + prettier |
| CI workflow | `.github/workflows/ci.yml` | L2 全量检查 |
| PR 模板 | `.github/PULL_REQUEST_TEMPLATE.md` | INV Checklist + 设计文档 + 验证证据 |
| 依赖方向规则 | `.dependency-cruiser.cjs`（计划实现）或自写脚本 | 检查分层依赖是否合规 |

---

## 五、Invariant Checklist CI 解析逻辑

```bash
#!/bin/bash
# scripts/check_invariant_checklist.sh（计划实现）
# 解析 PR body 中的 Invariant Checklist

PR_BODY=$(gh pr view "$PR_NUMBER" --json body -q '.body')

# 检查每个 INV 是否已填写
for i in $(seq 1 10); do
  if ! echo "$PR_BODY" | grep -q "INV-$i"; then
    echo "ERROR: INV-$i not found in PR body"
    exit 1
  fi
  # 检查是否已勾选（遵守 / 不涉及 / 违反）
  if ! echo "$PR_BODY" | grep "INV-$i" | grep -qE '(遵守|不涉及|违反)'; then
    echo "ERROR: INV-$i not checked (must be: 遵守 / 不涉及 / 违反)"
    exit 1
  fi
done

echo "All Invariants checked."
```

## 六、依赖方向检查规则

以下是必须检查的依赖方向违规：

| 违规类型 | 检测规则 | 严重级 |
| --- | --- | --- |
| Renderer import Main | apps/desktop/renderer/ 不能 import apps/desktop/main/ | 阻止合并 |
| DB import Service | db/ 不能 import services/ | 阻止合并 |
| IPC 直调 Service | ipc/ 只能 import core/commandDispatcher | 阻止合并 |
| Service import CommandDispatcher | services/ 不能 import core/commandDispatcher | 阻止合并 |
| Shared import 业务层 | packages/shared/ 不能 import apps/ | 阻止合并 |

可用 dependency-cruiser 配置（计划实现）：

```js
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    {
      name: 'renderer-no-main',
      severity: 'error',
      from: { path: 'apps/desktop/renderer' },
      to: { path: 'apps/desktop/main' }
    },
    {
      name: 'db-no-services',
      severity: 'error',
      from: { path: 'apps/desktop/main/src/db' },
      to: { path: 'apps/desktop/main/src/services' }
    },
    {
      name: 'ipc-only-dispatcher',
      severity: 'error',
      from: { path: 'apps/desktop/main/src/ipc' },
      to: {
        path: 'apps/desktop/main/src/services',
        pathNot: 'apps/desktop/main/src/core/commandDispatcher'
      }
    },
    {
      name: 'shared-no-apps',
      severity: 'error',
      from: { path: 'packages/shared' },
      to: { path: 'apps/' }
    }
  ]
}
```
