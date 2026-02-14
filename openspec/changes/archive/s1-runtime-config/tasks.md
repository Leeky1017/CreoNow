## 1. Specification

- [x] 1.1 审阅 `docs/plans/unified-roadmap.md` 中 `s1-runtime-config（A7-H-009 ~ A7-H-012）` 的问题定义、阈值清单与验收边界
- [x] 1.2 审阅 `ipcGateway`、`aiService`、`kgService`、`rag` 的当前硬编码位置，确认仅覆盖“运行时治理配置中心”边界
- [x] 1.3 审阅并确认 `openspec/changes/s1-runtime-config/specs/cross-module-integration-delta.md` 的 Requirement/Scenario 可直接映射测试
- [x] 1.4 先完成依赖同步检查（Dependency Sync Check）并落盘 `无漂移/已更新` 结论（结论：`NO_DRIFT`）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个失败测试（默认值、env 覆盖、非法 env 回退 + preload/main 一致性）
- [x] 2.2 为测试用例标注 Scenario ID（S1-RC-S1/S2/S3），建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

| Scenario ID | 测试文件                                                                | 测试名称（拟定）                                                               | 断言要点                                                 |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| S1-RC-S1    | `apps/desktop/main/src/config/__tests__/runtimeGovernance.test.ts`      | `returns roadmap defaults when env is not set`                                 | 未设置 env 时返回 roadmap 约定默认值                     |
| S1-RC-S2    | `apps/desktop/main/src/config/__tests__/runtimeGovernance.test.ts`      | `applies env override for numeric and array governance keys`                   | 合法 env 覆盖默认值（含 number 与 number[]）             |
| S1-RC-S3    | `apps/desktop/tests/integration/runtime-governance-consistency.test.ts` | `falls back on invalid env and keeps preload/main governance value consistent` | 非法 env 回退默认值，且 preload/main 对同一 key 读数一致 |

## 3. Red（先写失败测试）

- [x] 3.1 在 `runtimeGovernance.test.ts` 编写 S1-RC-S1 失败测试：无 env 时断言默认值矩阵
- [x] 3.2 在 `runtimeGovernance.test.ts` 编写 S1-RC-S2 失败测试：合法 env 覆盖 number/number[]
- [x] 3.3 在 `runtime-governance-consistency.test.ts` 编写 S1-RC-S3 失败测试：非法 env 回退 + preload/main 一致性
- [x] 3.4 运行最小测试集并记录 Red 证据（失败输出与场景 ID 对应）

## 4. Green（最小实现通过）

- [x] 4.1 新增 `runtimeGovernance` 配置中心，实现默认值、env 覆盖、非法值回退
- [x] 4.2 替换 `aiService`、`kgService`、`rag`、`ipcGateway` 中目标硬编码阈值为配置读取
- [x] 4.3 仅实现使 S1-RC-S1/S2/S3 转绿的最小改动，不引入额外功能
- [x] 4.4 复跑对应测试确认全部 Green

## 5. Refactor（保持绿灯）

- [x] 5.1 去重配置解析逻辑，避免各模块二次解析 env
- [x] 5.2 校验命名与注释可读性，防止过度抽象导致追踪困难
- [x] 5.3 复跑受影响回归测试，确认行为契约不变

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Red/Green 关键命令、输出与结论
- [x] 6.2 在 RUN_LOG 记录依赖同步检查（Dependency Sync Check）输入、核对项、结论（无漂移/已更新）
- [x] 6.3 在 RUN_LOG 记录 preload/main 一致性验证证据与配置回退证据
