## 1. Specification

- [x] 1.1 审阅并确认 `docs/plans/unified-roadmap.md` 中 `s1-path-alias` 的范围边界（paths alias + 批量替换）。
- [x] 1.2 审阅并确认 `openspec/changes/s1-path-alias/specs/cross-module-integration-delta.md` 的 Requirement/Scenario 覆盖 `tsconfig alias`、`三端生效`、`深层相对路径替换验证`。
- [x] 1.3 审阅并确认受影响路径集合（`main/renderer/preload` + `packages/shared` 消费方）及不做项，避免超范围实现。
- [x] 1.4 完成 依赖同步检查（Dependency Sync Check） 并记录结论（本 change 无上游依赖，结论应为 `NO_DRIFT`）。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个可执行测试或校验用例。
- [x] 2.2 为每个用例标注对应 Scenario ID，建立可追踪关系。
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。
- [x] 2.4 明确运行命令与预期失败信号，并写入 RUN_LOG。

### Scenario → 测试映射

| Scenario ID | 测试/校验文件                                               | 用例名                                                            | 断言要点                                                                                |
| ----------- | ----------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| S1-PA-1     | `apps/desktop/tests/unit/config/path-alias.config.test.ts`  | `tsconfig base exposes @shared/* mapping`                         | `tsconfig.base.json` 提供 `@shared/* -> packages/shared/*`，且子项目继承后可见          |
| S1-PA-2     | `apps/desktop/tests/unit/config/path-alias.runtime.test.ts` | `@shared alias resolves in main renderer preload builds`          | `electron.vite.config.ts` 对 main/renderer/preload 均配置 `@shared`，三端构建入口可解析 |
| S1-PA-3     | `scripts/tests/path-alias-migration-check.test.ts`          | `no deep relative packages/shared imports remain after migration` | 目标范围内不再出现 `../.../packages/shared/` 深层相对路径 import                        |

## 3. Red（先写失败测试）

- [x] 3.1 编写 S1-PA-1 失败测试，先验证现状下 alias 配置断言失败。
- [x] 3.2 编写 S1-PA-2 失败测试，先验证三端 alias 覆盖断言失败。
- [x] 3.3 编写 S1-PA-3 失败校验，先验证仓库仍存在深层相对路径引用。
- [x] 3.4 运行对应测试/校验命令并记录 Red 证据（失败日志与命中样本）。

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 S1-PA-1/S1-PA-2/S1-PA-3 转绿的最小改动（tsconfig、vite alias、批量替换）。
- [x] 4.2 按 Scenario 顺序逐条转绿，避免一次性大改导致定位困难。
- [x] 4.3 复跑映射测试与关键类型检查，确认门禁恢复为 Green。

## 5. Refactor（保持绿灯）

- [x] 5.1 清理替换过程中的重复 import 样式与无效路径片段，保持最小噪声 diff。
- [x] 5.2 复核替换范围，确保未改动与 `packages/shared` 无关的导入语句。
- [x] 5.3 保持所有已通过测试继续为绿灯，不改变对外行为契约。

## 6. Evidence

- [x] 6.1 在 RUN_LOG 记录 Red/Green 命令、关键输出与结论（含命中数量变化）。
- [x] 6.2 记录 依赖同步检查（Dependency Sync Check） 的输入、核对结论与后续动作（`NO_DRIFT`）。
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA/三项 PASS/Blocking-Issues=0/Decision=ACCEPT）。
