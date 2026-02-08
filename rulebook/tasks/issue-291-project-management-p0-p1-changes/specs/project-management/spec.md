# Rulebook Delta: project-management（Issue-291）

## Scope

本 Rulebook task 对应两个串行 OpenSpec change：

1. `project-management-p0-creation-metadata-dashboard`
2. `project-management-p1-lifecycle-switch-delete`

## PM-1（P0）

- 覆盖 requirement：
  - 项目创建（3 场景）
  - 项目元数据（2 场景）
  - Dashboard（3 场景）
- 关键约束：
  - P0 数据模型、IPC 命名、Zod schema 落地
  - AI 辅助创建使用 mock
  - `knowledgeGraphId` / `defaultSkillSetId` 仅占位
  - 覆盖容量溢出与非法枚举

## PM-2（P1）

- 覆盖 requirement：
  - 多项目切换（2 场景）
  - 项目删除（2 场景）
  - 生命周期闭环（2 场景）
- 关键约束：
  - 依赖 PM-1 先合并
  - `project:switch` 调用 KG/MS mock/no-op 预留接口
  - 生命周期实现为代码级状态机，禁止硬编码 if/else
  - 覆盖并发删除、权限不足、数据库写失败

## Delivery Guardrails

- 主 spec 只读，不直接修改
- `tasks.md` 固定章节顺序与 Red gate 必须满足
- 交付必须经过 PR、auto-merge、控制面 `main` 收口
