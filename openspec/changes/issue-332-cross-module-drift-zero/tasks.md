## 1. Specification

- [x] 1.1 审阅并确认需求边界：本 change 仅针对 16 项已登记漂移做“实质对齐 + 白名单清零”
- [x] 1.2 审阅并确认错误路径与边界路径：命名治理冲突项通过 delta spec 统一，不放宽命名规则
- [x] 1.3 审阅并确认验收阈值：`cross-module:check` 必须 PASS 且无 DRIFT 输出
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 依赖 issue-328/330，已完成同步检查并记录

### Dependency Sync Check（issue-328 / issue-330）

- 输入：
  - `scripts/cross-module-contract-gate.ts`
  - `scripts/cross-module-contract-autofix.ts`
  - `openspec/guards/cross-module-contract-baseline.json`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- 核对项：
  - 数据结构：baseline 字段与 gate/autofix 读取语义一致
  - IPC 契约：3 段式命名治理与 cross-module 期望项一致性
  - 错误码：跨模块 required 错误码是否进入 `IPC_ERROR_CODES`
  - envelope：`desiredEnvelope` 与实际生成类型一致
- 结论：`已发现漂移并在本 change 文档中同步更新`，进入 Red 前已完成同步。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test/Check 映射

- [x] S1 `跨模块基线无白名单仍可通过 [MODIFIED]`
  - 测试：`apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`
  - 用例：`should pass strict drift-zero baseline against generated contract`
- [x] S2 `AI 技能流式通道拆分为 chunk/done [ADDED]`
  - 测试：`apps/desktop/tests/unit/ipc-preload-security.spec.ts`
  - 用例：验证 preload 订阅与审计通道为 `skill:stream:chunk`/`skill:stream:done`
- [x] S3 `ai:chat:send 与 export:project:bundle 可调用 [ADDED]`
  - 检查：`pnpm contract:check` + 目标通道出现在 `packages/shared/types/ipc-generated.ts`
- [x] S4 `跨模块错误码缺口清零 [MODIFIED]`
  - 检查：`pnpm cross-module:check` 不再出现 `approved-missing-error-code`
- [x] S5 `envelope 语义统一为 ok [MODIFIED]`
  - 测试：`apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`
  - 用例：`desiredEnvelope=ok` 下不出现 envelope drift

## 3. Red（先写失败测试）

- [x] 3.1 先将 gate 单测切到 drift-zero 目标基线并确认失败
- [x] 3.2 先将 AI 流式通道测试切到 chunk/done 并确认失败
- [x] 3.3 运行 `pnpm cross-module:check` 记录当前 DRIFT 失败证据

## 4. Green（最小实现通过）

- [x] 4.1 最小修改 IPC 契约与流式桥接，使 Red 转绿
- [x] 4.2 删除 baseline 对应 16 项例外并保持 gate PASS

## 5. Refactor（保持绿灯）

- [x] 5.1 清理历史 alias/missing 配置残留与测试夹具冗余
- [x] 5.2 保持对外行为单链路（不引入双栈）

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [ ] 6.3 等待 PR required checks 全绿并完成 auto-merge 后归档 change
