## 1. Specification

- [x] 1.1 审阅并确认 `s0-skill-loader-error` 的边界：仅修复目录读取错误被静默吞掉的问题
- [x] 1.2 审阅并确认错误路径与边界路径：`ENOENT`、`EACCES`、可读目录三类
- [x] 1.3 审阅并确认不可变契约：成功路径不变；失败路径返回结构化错误且可追踪
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A（本 change：N/A）

## 2. TDD Mapping（先测前提）

- [x] 2.1 建立 Scenario→测试映射：SLE-S1→`apps/desktop/tests/unit/skillLoader.test.ts`（missing dir structured error），SLE-S2→`apps/desktop/tests/unit/skillLoader.test.ts`（permission denied structured error），SLE-S3→`apps/desktop/tests/unit/skillLoader.test.ts`（normal dir returns dirs only）
- [x] 2.2 为每个测试标注 Scenario ID（`SLE-S1`/`SLE-S2`/`SLE-S3`），确保 RUN_LOG 可回溯
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

## 3. Red（先写失败测试）

- [x] 3.1 编写 `SLE-S1` 失败测试：目录不存在时返回 `{ dirs: [], error: { code: "ENOENT", path } }`
- [x] 3.2 编写 `SLE-S2` 失败测试：目录无权限时返回 `{ dirs: [], error: { code: "EACCES", path } }`
- [x] 3.3 编写 `SLE-S3` 失败测试：目录可读时仅返回 `dirs` 且 `error` 为空
- [x] 3.4 运行 `pnpm exec tsx apps/desktop/tests/unit/skillLoader.test.ts` 记录 Red 证据

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 `SLE-S1`/`SLE-S2`/`SLE-S3` 转绿的最小代码
- [x] 4.2 逐条使失败测试通过，并适配 `skillLoader` 内所有 `listSubdirs` 调用点，不引入无关行为

## 5. Refactor（保持绿灯）

- [x] 5.1 去重 `listSubdirs` 错误组装与日志逻辑，保持测试全绿
- [x] 5.2 不改变既有技能发现优先级与作用域解析契约（`builtin/global/project`）

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG
