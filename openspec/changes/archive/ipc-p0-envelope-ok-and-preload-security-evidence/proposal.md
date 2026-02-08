# 提案：ipc-p0-envelope-ok-and-preload-security-evidence

## 背景

IPC 集成审计（ISSUE-265）结果中存在两项“部分实现”：  
1) 文档中的 envelope 字段仍使用 `success`，而当前实现与类型统一为 `ok`。  
2) Preload 安全 S2（渲染进程无法获取 `ipcRenderer`）缺少专门自动化测试证据。  
若不收敛，会导致规范与实现不一致，并降低后续审计结论的可验证性。

## 变更内容

- 将 IPC 规范文档中的 envelope 文案统一为 `ok`（仅文档一致性修复，不改运行时接口）。
- 新增 preload 暴露安全自动化证据：unit + E2E 双证据覆盖。
- 回改指定 archived spec 的相关文案（按 owner 明确指令），并在 RUN_LOG 记录“历史回写”原因。

## 受影响模块

- `ipc` — 文档契约表达与 preload 安全证据完善。

## 不做什么

- 不实现 `#264`。
- 不修复 command-palette/export 的 E2E 稳定性问题。
- 不引入 `ok/success` 双字段兼容。

## 审阅状态

- Owner 审阅：`PENDING`

