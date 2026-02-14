## 1. Specification

- [ ] 1.1 审阅并确认 `s0-sandbox-enable` 的范围：启用 sandbox + 验证 preload 边界 + E2E 回归
- [ ] 1.2 审阅并确认错误路径与边界路径：sandbox 启用后 preload 失效、Node 能力泄露、启动回归失败
- [ ] 1.3 审阅并确认不可变契约：`window.api` 可用、IPC 主路径可用、渲染层不可直接访问 Node 能力
- [ ] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A（本 change：N/A）

## 2. TDD Mapping（先测前提）

- [ ] 2.1 建立 Scenario→测试映射：SSE-S1→`index` 窗口配置测试（`sandbox: true`），SSE-S2→preload 边界测试（仅 `contextBridge` 暴露 API、无 `window.require`/`window.ipcRenderer`），SSE-S3→E2E 回归（启动与主交互链路）
- [ ] 2.2 为每个测试标注 Scenario ID（`SSE-S1`/`SSE-S2`/`SSE-S3`），并在 E2E 用例中标注 sandbox 断言点
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

## 3. Red（先写失败测试）

- [ ] 3.1 编写 `SSE-S1` 失败测试：窗口创建配置断言 `webPreferences.sandbox === true`
- [ ] 3.2 编写 `SSE-S2` 失败测试：渲染层仅可访问 `window.api`，访问 `window.require` 或 `window.ipcRenderer` 失败
- [ ] 3.3 编写 `SSE-S3` 失败测试：执行 E2E 启动回归并增加 sandbox 相关断言（渲染进程受沙箱约束且主流程可用）

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现让 `SSE-S1`/`SSE-S2`/`SSE-S3` 转绿的最小代码（`sandbox: false` → `sandbox: true`）
- [ ] 4.2 逐条使失败测试通过，并在 preload 中修复任何 sandbox 不兼容调用（仅限必要最小改动）

## 5. Refactor（保持绿灯）

- [ ] 5.1 清理 preload 暴露面，保持 `contextBridge` 入口单一且可审计
- [ ] 5.2 不改变既有 IPC 契约命名、返回包络与主进程业务行为

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG
