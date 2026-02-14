# 提案：s0-skill-loader-error

## 背景

`apps/desktop/main/src/services/skills/skillLoader.ts` 在目录读取异常（如 `ENOENT`/`EACCES`）时会静默 `return []`，上层被误导为“当前没有技能”。该行为掩盖真实故障，导致排障困难，并可能触发错误的空状态分支。

## 变更内容

- 将 `listSubdirs` 从“仅返回数组”调整为“返回 `dirs + structured error`”。
- 统一记录目录读取失败的结构化信息（错误码、路径）并向上层透传。
- 为 `skillLoader` 增加目录不存在/权限不足/正常路径的回归测试，确保不再静默降级。

## 受影响模块

- `skill-system` — 技能目录扫描与加载入口的错误语义。

## 依赖关系

- 上游依赖：无（Sprint0 并行组 A，独立项）。
- 横向关注：调用方（`loadBuiltinSkills`、`loadUserSkills`）需区分“读取失败”与“目录为空”语义。

## Dependency Sync Check

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s0-skill-loader-error` 条目；
  - `openspec/specs/skill-system/spec.md` 中技能加载与错误处理相关要求。
- 核对项：
  - 目录读取失败必须返回结构化错误而非静默空列表；
  - 成功路径目录发现行为保持不变；
  - 上层可追踪失败原因（`code/path`）并保留失败语义。
- 结论：`NO_DRIFT`（与 Sprint0 定义一致，可进入后续 TDD 实施）。

## 踩坑提醒

- `listSubdirs` 返回类型变化是 breaking change；`loadBuiltinSkills` 与 `loadUserSkills` 等调用点必须全部适配，不能遗漏任何旧签名调用。

## 防治标签

- `FALLBACK` `FAKETEST`

## 不做什么

- 不改动 Skill 执行器、调度器、IPC 通道契约。
- 不引入新的技能来源或存储机制。

## 审阅状态

- Owner 审阅：`PENDING`
