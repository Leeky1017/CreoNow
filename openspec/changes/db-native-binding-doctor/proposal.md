# 提案：db-native-binding-doctor

## 背景

Issue #266 显示 AI 面板出现 `Skills unavailable / Database not ready / DB_ERROR`。根因是 `better-sqlite3` 原生绑定与当前 Electron/Node ABI 不匹配，导致主进程数据库初始化失败。

当前问题：

- 启动日志虽记录 `migration_failed`，但缺少结构化“诊断结论 + 修复指令”
- 渲染层收到的错误仅为 `Database not ready`，用户不知道下一步操作
- 缺少统一、可复现的原生依赖修复入口说明

## 变更内容

- 增加 DB 启动失败 doctor 诊断（ABI mismatch / bindings missing / unknown）并返回可执行修复命令。
- 将 DB 初始化失败诊断透传到 AI 相关 IPC（skills / ai / ai-proxy）的 `DB_ERROR` 响应。
- 提供统一修复命令入口（`desktop:rebuild:native`）并在错误文案中指向该命令。

## 受影响模块

- `ai-service`：AI 面板错误可操作化。
- `ipc`：DB 不可用时错误 envelope 增强（message/details）。

## 不做什么

- 不在本任务中实现“AI 输出自动写回编辑器正文”。
- 不改动主 spec（`openspec/specs/**`）。
- 不改动非 AI 路径的所有 DB handler 文案（仅覆盖本 issue 直接链路）。

## 审阅状态

- Owner 审阅：`PENDING`

