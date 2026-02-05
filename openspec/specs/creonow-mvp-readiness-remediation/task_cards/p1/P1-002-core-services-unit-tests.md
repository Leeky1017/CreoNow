# P1-002: Core Services 单元测试（project/document/kg/ai）

Status: todo

## Goal

为核心 main services 增加可重复的单元测试与边界测试，补齐审评指出的“服务层无测试”短板。

目标服务（写死）：

- `apps/desktop/main/src/services/projects/projectService.ts`
- `apps/desktop/main/src/services/documents/documentService.ts`
- `apps/desktop/main/src/services/kg/kgService.ts`
- `apps/desktop/main/src/services/ai/aiService.ts`

> 注：P0-001 已要求为 projectService 增加最小单测；本卡在其基础上扩充覆盖与边界测试。

## Dependencies

- Spec: `../spec.md#cnmvp-req-011`
- Design: `../design/05-test-strategy-and-ci.md`

## Expected File Changes

| 操作       | 文件路径                                                                            |
| ---------- | ----------------------------------------------------------------------------------- |
| Add/Update | `apps/desktop/tests/unit/projectService.*.test.ts`（扩充覆盖）                      |
| Add        | `apps/desktop/tests/unit/documentService.test.ts`                                   |
| Add        | `apps/desktop/tests/unit/kgService.test.ts`                                         |
| Add        | `apps/desktop/tests/unit/aiService.retry-and-error.test.ts`（与 P1-007 共享或拆分） |
| Update     | `package.json`（若 root `test:unit` 需要纳入新增脚本，必须显式添加）                |

## Detailed Breakdown（写死测试口径）

1. projectService
   - create/list/getCurrent/setCurrent/delete/rename/archive/duplicate 的 happy path
   - 边界：
     - INVALID_ARGUMENT（空 id/空 name/超长 name）
     - NOT_FOUND（不存在 projectId）
     - DB_ERROR（模拟 prepare/run 异常）
2. documentService
   - create/read/write/rename/delete 的 roundtrip
   - 版本写入：写入后 `version:list/read/restore` 的最小闭环（可复用现有 IPC/service）
3. kgService
   - entity CRUD
   - relation CRUD
   - 边界：缺字段、非法 JSON metadata
4. aiService
   - upstream error mapping（已有相关 unit tests 可扩充）
   - P1-007 实现后覆盖 retry/backoff 关键路径

## Acceptance Criteria

- [ ] 四个核心 services 均有 unit tests（每个 ≥ 1 个边界用例）
- [ ] `pnpm test:unit` 在 CI 与本地稳定通过
- [ ] 新增测试不依赖真实网络/真实 API key（必须 stub）

## Tests

- [ ] `pnpm test:unit`

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`
