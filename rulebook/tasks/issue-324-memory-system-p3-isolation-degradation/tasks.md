## 1. Specification

- [x] 1.1 审阅 `openspec/specs/memory-system/spec.md` 与 MS-4 delta 约束
- [x] 1.2 完成 Dependency Sync Check（对齐 MS-2/MS-3 产出与本 change 假设）
- [x] 1.3 记录 IPC 命名治理约束并将提升通道落到 `memory:scope:promote`

## 2. TDD Mapping（先测前提）

- [x] 2.1 建立 MS4-R1-S1~S3 对应集成测试映射
- [x] 2.2 建立 MS4-R2-S1~S2、MS4-X-S1~S2 对应故障注入映射
- [x] 2.3 先运行 Red 失败证据后再进入 Green 实现

## 3. Red（先写失败测试）

- [x] 3.1 `promote/clear` 通道在实现前失败（handler 缺失）
- [x] 3.2 作用域优先级在实现前失败（全局规则未被覆盖）
- [x] 3.3 降级行为在实现前失败（distill/vector/all-memory 场景不满足）

## 4. Green（最小实现通过）

- [x] 4.1 实现 `project > global` 注入决策与 `memory:scope:promote`
- [x] 4.2 实现 `memory:clear:project` / `memory:clear:all` + 二次确认错误码
- [x] 4.3 实现降级事件与兜底（vector offline / all unavailable / distill io failed）

## 5. Refactor（保持绿灯）

- [x] 5.1 抽离作用域优先级与降级事件日志逻辑
- [x] 5.2 统一 IPC 契约、错误码、生成类型
- [x] 5.3 回归运行 unit/integration，确认新增场景进入主门禁

## 6. Evidence

- [x] 6.1 7 个新增集成场景 Red→Green 证据已记录到 RUN_LOG
- [x] 6.2 `pnpm typecheck` / `pnpm lint` / `pnpm test:unit` / `pnpm test:integration` 通过
- [x] 6.3 `pnpm contract:generate` 通过并更新 `packages/shared/types/ipc-generated.ts`
