# CN Engineering Gates — 索引

本目录是 CN 工程门禁规范的模块化拆解，原文件为 `docs/references/gates-design.md`。核心原则：不符合标准的产物，系统自动拦下，不让它进入主干、不让它发布。已实现的门禁（pre-commit hooks、CI checks）自动执行；部分高层门禁仍在建设中（详见各节标注）。

---

## 子文件索引

| 文件 | 涵盖内容 | 查阅时机 |
| --- | --- | --- |
| [l1-local-gates.md](l1-local-gates.md) | L1 本地门禁：pre-commit / pre-push hooks、lint-staged 配置 | 配置 git hooks / 调试本地拦截时 |
| [l2-pr-gates.md](l2-pr-gates.md) | L2 PR 门禁：CI workflow、检查项清单、Invariant Checklist 解析 | CI 配置 / PR 检查项变更时 |
| [l3-release-gates.md](l3-release-gates.md) | L3 发布门禁：自动版本号、灰度发布（P3 远景） | 发布流程设计时 |
| [agent-autonomy.md](agent-autonomy.md) | Agent 自治三阶段：设计先行 / 受约束编码 / Agent 审 Agent | Agent 工作流变更时 |
| [dependency-direction.md](dependency-direction.md) | 依赖方向检查规则、dependency-cruiser 配置 | 架构分层 / 依赖规则变更时 |

---

## 流水线全览

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

## 门禁配置清单

| 文件 | 路径 | 用途 | 状态 |
| --- | --- | --- | --- |
| pre-commit hook | `.githooks/pre-commit` | 控制面/main 拦截 + creonow-app lint-staged | ✅ 已实现 |
| pre-push hook | `.githooks/pre-push` | 控制面/main 推送拦截 | ✅ 已实现 |
| lint-staged 配置 | `creonow-app/package.json` | creonow-app/src/ 下 eslint + prettier | ✅ 已实现 |
| CI workflow | `.github/workflows/ci.yml` | L2 全量检查 | ✅ 已实现 |
| PR 模板 | `.github/PULL_REQUEST_TEMPLATE.md` | INV Checklist + 设计文档 + 验证证据 | ✅ 已实现 |
| 依赖方向规则 | `.dependency-cruiser.cjs`（计划实现）或自写脚本 | 检查分层依赖是否合规 | 🔲 计划实现 |
