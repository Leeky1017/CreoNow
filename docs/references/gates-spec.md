# CN Engineering Gates Specification

本文件定义 CN 的三层工程门禁与 Agent 自治流程。核心原则：不符合标准的产物，系统自动拦下，不让它进入主干、不让它发布。所有门禁自动化，Agent 无法绕过。

---

## 一、三层门禁

### L1 -- 本地门禁

- 触发时机：pre-commit / pre-push
- 检查项：格式化 / Lint / 类型检查 / 快速单测
- 失败行为：阻止 commit/push
- 实现：`.husky/`（计划实现）+ lint-staged

配置示例：

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit（计划实现）
pnpm lint-staged

# .husky/pre-push（计划实现）
pnpm typecheck
pnpm test -- --run --changed
```

### L2 -- PR 门禁

- 触发时机：PR 创建/更新（CI）
- 检查项：
    - 全量测试 + 覆盖率 >= 80%
    - IPC 契约校验（contract:check）
    - 依赖方向检查（dependency-cruiser 或自写脚本）
    - 构建校验（pnpm build）
    - Invariant Checklist 解析（INV-1~10 必须填写）
- 失败行为：阻止合并
- 实现：`.github/workflows/ci.yml`

CI Workflow 结构：

```yaml
# .github/workflows/ci.yml
name: PR Check
on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Test + Coverage
        run: pnpm test -- --run --coverage

      - name: Coverage Gate
        run: |
          # 检查覆盖率 >= 80%
          # 解析 coverage 报告，低于阈值则失败

      - name: Dependency Direction Check
        run: |
          # 检查依赖方向是否合规
          # Renderer 不能直接 import Main Process
          # DB Layer 不能 import Service Layer

      - name: IPC Contract Check
        run: pnpm contract:check

      - name: Build
        run: pnpm build

      - name: Invariant Checklist Parse
        run: |
          # 解析 PR body 中的 Invariant Checklist
          # 检查 INV-1~10 是否都已填写
          # 未填写 = 失败
```

### L3 -- 发布门禁

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

写入 PR 描述，CI 检查存在性。

### 阶段 B -- 受约束编码

PR 描述包含 Invariant Checklist（INV-1~10 逐条勾选），CI 自动解析，未填写 = 阻止合并。

每条必须声明：

- 遵守：本次改动符合该 INV
- 不涉及：本次改动与该 INV 无关
- 违反（附理由）：明确说明为什么违反以及补救措施

### 阶段 C -- Agent 审 Agent

合并后触发 Audit Agent：

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
  -> L1: pre-commit（格式化 / Lint / 类型 / 快速单测）
  -> 推送 -> PR
  -> L2: CI 全量检查（测试 + 覆盖率 + 依赖方向 + 契约 + 构建 + INV Checklist）
    -> 通过 -> 合并 main
    -> 失败 -> 回到编码
  -> 合并后:
    -> 阶段 C: Audit Agent 审计
    -> L3: 构建 + 灰度
      -> 正常 -> 全量发布
      -> 异常 -> 自动回滚
```

## 四、门禁配置清单

以下是 Week 0 需要配置的门禁文件：

| 文件 | 路径 | 用途 |
| --- | --- | --- |
| pre-commit hook | `.husky/pre-commit`（计划实现） | lint-staged（格式化 + Lint） |
| pre-push hook | `.husky/pre-push`（计划实现） | typecheck + 快速单测 |
| lint-staged 配置 | `package.json` 或 `.lintstagedrc` | 定义 pre-commit 要跑的命令 |
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
