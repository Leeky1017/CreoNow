> 本文件是 gates-design 的一部分，完整索引见 [docs/references/gates-design/README.md](README.md)

# L2 — PR 门禁

- 触发时机：push to main / PR 创建或更新（CI）
- 失败行为：阻止合并
- 实现：`.github/workflows/ci.yml`

---

## 检查项（当前已实现）

| 检查 | 命令 | 说明 |
| --- | --- | --- |
| Type check | `pnpm typecheck` | TypeScript strict mode |
| IPC 契约校验 | `pnpm contract:check` | IPC schema 自动生成 + 比对 |
| Spec-test mapping gate | `pnpm gate:spec-test-mapping` | Spec Scenario 覆盖检查 |
| Service stub detector | `node --import tsx scripts/service-stub-detector-gate.ts` | 检测未实现的 service stub |
| 单元测试 | `pnpm test:unit` | Vitest 单元测试全量 |
| 集成测试 | `pnpm test:integration` | 跨模块集成测试 |
| Renderer 测试 | `pnpm -C apps/desktop test:renderer` | 渲染进程测试 |
| Desktop core coverage gate | `pnpm -C apps/desktop test:coverage:core` | 覆盖率门禁（lines 70, branches 55） |
| Python 测试 | `pytest -q scripts/tests` | 脚本测试 |
| Electron 构建 | `pnpm desktop:build` | 确保可构建 |
| Desktop Storybook 构建 | `pnpm -C apps/desktop storybook:build` | 前端组件库可构建 |
| Storybook chunk budget gate | `pnpm gate:storybook-budget` | Storybook 产物大小限制 |

## 检查项（计划实现）

- Lint（`pnpm lint`）
- 依赖方向检查（dependency-cruiser 或自写脚本，详见 [dependency-direction.md](dependency-direction.md)）
- Invariant Checklist 解析（INV-1~10 必须填写）

> **已实现位置**：CI workflow 完整定义见 `.github/workflows/ci.yml`；PR 模板见 `.github/PULL_REQUEST_TEMPLATE.md`。

---

## CI Workflow 结构（简化示意）

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

---

## Invariant Checklist CI 解析逻辑

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
