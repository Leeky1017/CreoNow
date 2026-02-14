## 1. Specification

- [ ] 1.1 审阅并确认 `s1-ipc-acl` 的范围：调用方来源 ACL + runtime-validation 准入集成 + preload origin 兼容
- [ ] 1.2 审阅并确认错误路径与边界路径：未知来源调用、角色不满足调用、dev/prod 来源差异
- [ ] 1.3 审阅并确认不可变契约：先校验后执行业务，拒绝路径统一返回 `FORBIDDEN`
- [ ] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A（本 change：依赖 `s0-sandbox-enable`）

## 2. TDD Mapping（先测前提）

- [ ] 2.1 建立 Scenario→测试映射：`SIA-S1`→`apps/desktop/main/src/ipc/__tests__/ipcAcl.test.ts`（来源校验），`SIA-S2`→`apps/desktop/main/src/ipc/__tests__/ipcAcl.test.ts`（dev/prod origin 兼容），`SIA-S3`→`apps/desktop/main/src/ipc/__tests__/runtimeValidation.acl.test.ts`（拒绝非法调用）
- [ ] 2.2 为每个测试标注 Scenario ID（`SIA-S1`/`SIA-S2`/`SIA-S3`），并在断言中绑定错误码与拒绝原因
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

## 3. Red（先写失败测试）

- [ ] 3.1 编写 `SIA-S1` 失败测试：未知 origin（如 `https://evil.com`）调用被拒绝，返回 `origin_not_allowed`
- [ ] 3.2 编写 `SIA-S2` 失败测试：`file://...` 与 `http://localhost:*` 来源在对应模式下被允许
- [ ] 3.3 编写 `SIA-S3` 失败测试：runtime-validation 在 handler 执行前拒绝非法调用并返回 `FORBIDDEN`
- [ ] 3.4 运行 ACL 相关单测并记录 Red 证据

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现让 `SIA-S1`/`SIA-S2`/`SIA-S3` 转绿的最小代码（`ipcAcl.ts` + runtime-validation 集成）
- [ ] 4.2 逐条使失败测试通过，不引入无关功能（不新增通道、不修改业务 handler 语义）

## 5. Refactor（保持绿灯）

- [ ] 5.1 清理 ACL 规则定义与测试夹具，保持规则可读与可维护
- [ ] 5.2 保持 preload/main 的 origin 判定口径一致，不改变既有 IPC 契约命名与包络格式

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录 依赖同步检查（Dependency Sync Check） 的输入、核对结论与后续动作（无漂移/已更新）
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG
